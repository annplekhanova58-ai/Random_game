use std::path::PathBuf;
use std::sync::Mutex;

use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::Manager;

struct Db(Mutex<Connection>);

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Settings {
    max_price_usd: Option<f64>,
    free_only: bool,
    language: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SettingsPatch {
    max_price_usd: Option<f64>,
    free_only: Option<bool>,
    language: Option<String>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct RollRow {
    id: String,
    app_id: u32,
    name: String,
    price_usd: f64,
    cover: String,
    description: String,
    rolled_at: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct NewRoll {
    app_id: u32,
    name: String,
    price_usd: f64,
    cover: String,
    description: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SearchHit {
    app_id: u32,
    name: String,
    cover: String,
    /// Current price in USD cents. `Some(0)` is free. `None` means the row had no price.
    price_cents: Option<i64>,
    pre_purchase: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SearchPage {
    total_count: u32,
    hits: Vec<SearchHit>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AppDetails {
    app_id: u32,
    name: String,
    kind: String,
    coming_soon: bool,
    is_free: bool,
    price_usd: Option<f64>,
    currency: Option<String>,
    cover: String,
    description: String,
}

fn db_path(app: &tauri::App) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|err| err.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|err| err.to_string())?;
    Ok(dir.join("random-steam-game.db"))
}

fn open_db(path: &PathBuf) -> Result<Connection, String> {
    let conn = Connection::open(path).map_err(|err| err.to_string())?;
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS settings (
            id TEXT PRIMARY KEY,
            max_price_usd REAL,
            free_only INTEGER NOT NULL DEFAULT 0,
            language TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS rolls (
            id TEXT PRIMARY KEY,
            steam_app_id INTEGER NOT NULL UNIQUE,
            name TEXT NOT NULL,
            price_usd REAL NOT NULL,
            cover TEXT NOT NULL,
            description TEXT NOT NULL,
            rolled_at TEXT NOT NULL
        );
        ",
    )
    .map_err(|err| err.to_string())?;
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM settings", [], |row| row.get(0))
        .map_err(|err| err.to_string())?;
    if count == 0 {
        let now = chrono::Local::now().to_rfc3339();
        let language = std::env::var("LANG").unwrap_or_default();
        let language = if language.to_ascii_lowercase().starts_with("en") {
            "en"
        } else {
            "ru"
        };
        conn.execute(
            "INSERT INTO settings (id, max_price_usd, free_only, language, created_at, updated_at)
             VALUES (?1, NULL, 0, ?2, ?3, ?3)",
            params![uuid::Uuid::new_v4().to_string(), language, now],
        )
        .map_err(|err| err.to_string())?;
    }
    Ok(conn)
}

fn map_roll(row: &rusqlite::Row) -> rusqlite::Result<RollRow> {
    Ok(RollRow {
        id: row.get(0)?,
        app_id: row.get(1)?,
        name: row.get(2)?,
        price_usd: row.get(3)?,
        cover: row.get(4)?,
        description: row.get(5)?,
        rolled_at: row.get(6)?,
    })
}

fn unescape(value: &str) -> String {
    value
        .replace("&amp;", "&")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
}

fn between<'a>(haystack: &'a str, start: &str, end: &str) -> Option<&'a str> {
    let from = haystack.find(start)? + start.len();
    let rest = &haystack[from..];
    let to = rest.find(end)?;
    Some(&rest[..to])
}

fn row_price_cents(window: &str) -> Option<i64> {
    let marker = "discount_final_price";
    let idx = window.find(marker)?;
    let tail = &window[idx..window.len().min(idx + 220)];
    // The CSS class is the source of truth. CS2 advertises data-price-final="1499" and still says Free.
    if tail.contains(" free") || tail.contains(">Free<") || tail.contains(">Бесплатно<") {
        return Some(0);
    }
    let key = "data-price-final=\"";
    let start = window[..idx]
        .rfind(key)
        .or_else(|| window[idx..].find(key).map(|pos| idx + pos))?;
    let digits: String = window[start + key.len()..]
        .chars()
        .take_while(|ch| ch.is_ascii_digit())
        .collect();
    digits.parse().ok()
}

fn parse_hits(html: &str) -> Vec<SearchHit> {
    let mut hits = Vec::new();
    for part in html.split("data-ds-appid=\"").skip(1) {
        let Some(end) = part.find('"') else { continue };
        let id_token = part[..end].split(',').next().unwrap_or("").trim();
        let Ok(app_id) = id_token.parse::<u32>() else { continue };
        let window_end = part.find("</a>").unwrap_or(part.len()).min(8000);
        let window = &part[..window_end];
        let name = unescape(between(window, "<span class=\"title\">", "</span>").unwrap_or(""));
        let cover = unescape(between(window, "<img src=\"", "\"").unwrap_or(""));
        if name.is_empty() {
            continue;
        }
        hits.push(SearchHit {
            app_id,
            name,
            cover,
            price_cents: row_price_cents(window),
            pre_purchase: window.contains("prepurchase_tag"),
        });
    }
    hits
}

fn search_url(start: u32, count: u32, free_only: bool, max_price_usd: Option<f64>) -> String {
    let mut url = format!(
        "https://store.steampowered.com/search/results/?json=1&infinite=1&ignore_preferences=1&category1=998&cc=US&l=russian&start={start}&count={count}"
    );
    if free_only {
        url.push_str("&maxprice=free");
    } else if let Some(price) = max_price_usd {
        // Steam treats maxprice=0 as "no filter". A ceiling of 0 means free games only.
        if price <= 0.0 {
            url.push_str("&maxprice=free");
        } else {
            let dollars = price.ceil() as u32;
            url.push_str(&format!("&maxprice={dollars}"));
        }
    }
    url
}

async fn get_json(url: String) -> Result<Value, String> {
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36")
        .timeout(std::time::Duration::from_secs(20))
        .build()
        .map_err(|err| err.to_string())?;
    let response = client
        .get(url)
        .header("Accept-Language", "ru-RU,ru;q=0.9,en;q=0.5")
        .send()
        .await
        .map_err(|err| err.to_string())?;
    if !response.status().is_success() {
        return Err(format!("Steam HTTP {}", response.status()));
    }
    response.json().await.map_err(|err| err.to_string())
}

#[tauri::command]
fn settings_get(db: tauri::State<Db>) -> Result<Settings, String> {
    let conn = db.0.lock().map_err(|err| err.to_string())?;
    conn.query_row(
        "SELECT max_price_usd, free_only, language FROM settings LIMIT 1",
        [],
        |row| {
            let free_only: i64 = row.get(1)?;
            Ok(Settings {
                max_price_usd: row.get(0)?,
                free_only: free_only != 0,
                language: row.get(2)?,
            })
        },
    )
    .map_err(|err| err.to_string())
}

#[tauri::command]
fn settings_set(db: tauri::State<Db>, patch: SettingsPatch) -> Result<Settings, String> {
    let conn = db.0.lock().map_err(|err| err.to_string())?;
    let now = chrono::Local::now().to_rfc3339();
    if let Some(price) = patch.max_price_usd {
        if price < 0.0 {
            return Err("Цена не может быть отрицательной".into());
        }
        conn.execute(
            "UPDATE settings SET max_price_usd = ?1, updated_at = ?2",
            params![price, now],
        )
        .map_err(|err| err.to_string())?;
    }
    if let Some(free_only) = patch.free_only {
        conn.execute(
            "UPDATE settings SET free_only = ?1, updated_at = ?2",
            params![if free_only { 1 } else { 0 }, now],
        )
        .map_err(|err| err.to_string())?;
    }
    if let Some(language) = patch.language {
        if language != "ru" && language != "en" {
            return Err("Неизвестный язык".into());
        }
        conn.execute(
            "UPDATE settings SET language = ?1, updated_at = ?2",
            params![language, now],
        )
        .map_err(|err| err.to_string())?;
    }
    drop(conn);
    settings_get(db)
}

#[tauri::command]
fn history_list(db: tauri::State<Db>) -> Result<Vec<RollRow>, String> {
    let conn = db.0.lock().map_err(|err| err.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, steam_app_id, name, price_usd, cover, description, rolled_at FROM rolls ORDER BY rolled_at DESC")
        .map_err(|err| err.to_string())?;
    let rows = stmt
        .query_map([], map_roll)
        .map_err(|err| err.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|err| err.to_string())?;
    Ok(rows)
}

#[tauri::command]
fn history_add(db: tauri::State<Db>, roll: NewRoll) -> Result<RollRow, String> {
    let conn = db.0.lock().map_err(|err| err.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let rolled_at = chrono::Local::now().to_rfc3339();
    conn.execute(
        "INSERT INTO rolls (id, steam_app_id, name, price_usd, cover, description, rolled_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![id, roll.app_id, roll.name, roll.price_usd, roll.cover, roll.description, rolled_at],
    )
    .map_err(|err| err.to_string())?;
    Ok(RollRow {
        id,
        app_id: roll.app_id,
        name: roll.name,
        price_usd: roll.price_usd,
        cover: roll.cover,
        description: roll.description,
        rolled_at,
    })
}

#[tauri::command]
fn history_delete(db: tauri::State<Db>, id: String) -> Result<(), String> {
    let conn = db.0.lock().map_err(|err| err.to_string())?;
    conn.execute("DELETE FROM rolls WHERE id = ?1", params![id])
        .map_err(|err| err.to_string())?;
    Ok(())
}

#[tauri::command]
fn history_clear(db: tauri::State<Db>) -> Result<(), String> {
    let conn = db.0.lock().map_err(|err| err.to_string())?;
    conn.execute("DELETE FROM rolls", [])
        .map_err(|err| err.to_string())?;
    Ok(())
}

#[tauri::command]
async fn steam_search(start: u32, count: u32, free_only: bool, max_price_usd: Option<f64>) -> Result<SearchPage, String> {
    let count = count.clamp(1, 25);
    let url = search_url(start, count, free_only, max_price_usd);
    let body = get_json(url).await?;
    let total_count = body.get("total_count").and_then(|value| value.as_u64()).unwrap_or(0) as u32;
    let html = body.get("results_html").and_then(|value| value.as_str()).unwrap_or("");
    Ok(SearchPage {
        total_count,
        hits: parse_hits(html),
    })
}

fn steam_store_url(app_id: u32) -> String {
    format!("https://store.steampowered.com/app/{app_id}?l=russian")
}

/// Opens the store page in the system browser. The window's webview ignores `target=_blank`.
#[tauri::command]
fn open_steam(app_id: u32) -> Result<(), String> {
    if app_id == 0 {
        return Err("missing app".into());
    }
    open::that_detached(steam_store_url(app_id)).map_err(|err| err.to_string())
}

#[tauri::command]
async fn steam_details(app_id: u32) -> Result<Option<AppDetails>, String> {
    let url = format!("https://store.steampowered.com/api/appdetails?appids={app_id}&cc=US&l=russian");
    let body = get_json(url).await?;
    let node = body.get(app_id.to_string()).cloned().unwrap_or(Value::Null);
    if node.get("success").and_then(|value| value.as_bool()) != Some(true) {
        return Ok(None);
    }
    let data = node.get("data").cloned().unwrap_or(Value::Null);
    let price = data.get("price_overview");
    let currency = price
        .and_then(|value| value.get("currency"))
        .and_then(|value| value.as_str())
        .map(str::to_string);
    let final_cents = price.and_then(|value| value.get("final")).and_then(|value| value.as_f64());
    let price_usd = match (data.get("is_free").and_then(|value| value.as_bool()).unwrap_or(false), currency.as_deref(), final_cents) {
        (true, _, _) => Some(0.0),
        (_, Some("USD"), Some(cents)) => Some(cents / 100.0),
        _ => None,
    };
    Ok(Some(AppDetails {
        app_id,
        name: data.get("name").and_then(|value| value.as_str()).unwrap_or("").to_string(),
        kind: data.get("type").and_then(|value| value.as_str()).unwrap_or("").to_string(),
        coming_soon: data
            .get("release_date")
            .and_then(|value| value.get("coming_soon"))
            .and_then(|value| value.as_bool())
            .unwrap_or(true),
        is_free: data.get("is_free").and_then(|value| value.as_bool()).unwrap_or(false),
        price_usd,
        currency,
        cover: data.get("header_image").and_then(|value| value.as_str()).unwrap_or("").to_string(),
        description: data
            .get("short_description")
            .and_then(|value| value.as_str())
            .unwrap_or("")
            .to_string(),
    }))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let path = db_path(app)?;
            let conn = open_db(&path)?;
            app.manage(Db(Mutex::new(conn)));
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_fullscreen(true);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            settings_get,
            settings_set,
            history_list,
            history_add,
            history_delete,
            history_clear,
            steam_search,
            steam_details,
            open_steam
        ])
        .run(tauri::generate_context!())
        .expect("random steam game window failed");
}

#[cfg(test)]
mod tests {
    use super::{parse_hits, search_url, steam_store_url};

    const ROW: &str = r#"
        <a data-ds-appid="4435490"><img src="https://cdn.example/cod.jpg" >
            <span class="title">Call of Duty</span>
            <div class="prepurchase_tag">Pre-Purchase</div>
            <div data-price-final="6999"><div class="discount_final_price">$69.99</div></div>
        </a>
        <a data-ds-appid="730"><img src="https://cdn.example/cs.jpg" >
            <span class="title">Counter-Strike 2</span>
            <div data-price-final="1499"><div class="discount_final_price free">Free</div></div>
        </a>
        <a data-ds-appid="10,20"><img src="https://cdn.example/pack.jpg" >
            <span class="title">Pack</span>
            <div data-price-final="500"><div class="discount_final_price">$5.00</div></div>
        </a>
    "#;

    #[test]
    fn parses_price_free_label_and_prepurchase() {
        let hits = parse_hits(ROW);
        assert_eq!(hits.len(), 3);
        assert_eq!(hits[0].app_id, 4435490);
        assert!(hits[0].pre_purchase);
        assert_eq!(hits[0].price_cents, Some(6999));
        assert_eq!(hits[1].app_id, 730);
        assert!(!hits[1].pre_purchase);
        assert_eq!(hits[1].price_cents, Some(0));
        assert_eq!(hits[1].cover, "https://cdn.example/cs.jpg");
        assert_eq!(hits[2].app_id, 10);
        assert_eq!(hits[2].price_cents, Some(500));
    }

    #[test]
    fn steam_link_stays_on_the_store_page() {
        assert_eq!(
            steam_store_url(730),
            "https://store.steampowered.com/app/730?l=russian"
        );
    }

    #[test]
    fn zero_ceiling_asks_steam_for_free_games() {
        let url = search_url(0, 25, false, Some(0.0));
        assert!(url.contains("maxprice=free"));
        assert!(!url.contains("maxprice=0"));
        let paid = search_url(25, 25, false, Some(19.2));
        assert!(paid.contains("maxprice=20"));
        assert!(paid.contains("start=25"));
        assert!(paid.contains("cc=US"));
        assert!(paid.contains("l=russian"));
    }
}
