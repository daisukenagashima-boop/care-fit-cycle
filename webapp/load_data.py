import sqlite3
import sys

# データベースファイルのパス
db_path = '.wrangler/state/v3/d1/miniflare-D1DatabaseObject/d7e7dad26bda2eb41e10f2b5b0776873c53023ab37e537e0aca2622a0a57c851.sqlite'

# SQLファイルを読み込む
with open('seed_5days_corrected.sql', 'r', encoding='utf-8') as f:
    sql_script = f.read()

# データベースに接続してSQLを実行
try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.executescript(sql_script)
    conn.commit()
    print("✅ 5日分のケース記録を正常に投入しました")
    
    # 確認
    cursor.execute("SELECT COUNT(*) FROM case_records WHERE resident_id = 1")
    count = cursor.fetchone()[0]
    print(f"📊 投入されたケース記録数: {count}件")
    
    cursor.execute("SELECT DISTINCT recorded_date FROM case_records WHERE resident_id = 1 ORDER BY recorded_date")
    dates = cursor.fetchall()
    print(f"📅 記録された日付: {', '.join([d[0] for d in dates])}")
    
    conn.close()
except Exception as e:
    print(f"❌ エラー: {e}")
    sys.exit(1)
