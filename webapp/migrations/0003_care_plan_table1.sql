-- 施設サービス計画書 第1表
CREATE TABLE IF NOT EXISTS care_plan_table1 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  resident_id INTEGER NOT NULL UNIQUE,
  cm_name TEXT DEFAULT '',           -- 計画作成者氏名（CM）
  facility_name TEXT DEFAULT '',     -- 施設名
  created_date TEXT DEFAULT '',      -- 計画作成日
  revised_date TEXT DEFAULT '',      -- 計画変更日
  certification_status TEXT DEFAULT '認定済', -- 認定済/申請中
  valid_period_from TEXT DEFAULT '', -- 認定有効期間 開始
  valid_period_to TEXT DEFAULT '',   -- 認定有効期間 終了
  entry_background TEXT DEFAULT '',  -- 入所の至った経緒
  resident_wishes TEXT DEFAULT '',   -- 本人の意向
  family_wishes TEXT DEFAULT '',     -- 家族の意向
  comprehensive_policy TEXT DEFAULT '', -- 総合的な支援の方针
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE CASCADE
);
