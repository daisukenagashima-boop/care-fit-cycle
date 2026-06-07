-- 施設サービス計画書 第2表: 課題・目標・援助内容
CREATE TABLE IF NOT EXISTS care_goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  resident_id INTEGER NOT NULL,
  sort_order INTEGER DEFAULT 0,
  needs TEXT DEFAULT '',            -- 生活全般の解決すべき課題（ニーズ）
  long_term_goal TEXT DEFAULT '',   -- 長期目標
  long_term_from TEXT DEFAULT '',   -- 長期目標期間 開始
  long_term_to TEXT DEFAULT '',     -- 長期目標期間 終了
  short_term_goal TEXT DEFAULT '',  -- 短期目標
  short_term_from TEXT DEFAULT '',  -- 短期目標期間 開始
  short_term_to TEXT DEFAULT '',    -- 短期目標期間 終了
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE CASCADE
);

-- 援助内容（課題ごとに複数）
CREATE TABLE IF NOT EXISTS care_goal_services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  care_goal_id INTEGER NOT NULL,
  service_content TEXT DEFAULT '',  -- サービス内容
  service_type TEXT DEFAULT '',     -- サービス種別
  person TEXT DEFAULT '',           -- 担当者
  frequency TEXT DEFAULT '',        -- 頻度
  period_from TEXT DEFAULT '',
  period_to TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  FOREIGN KEY (care_goal_id) REFERENCES care_goals(id) ON DELETE CASCADE
);

-- care_plans に care_goal_id を追加（24Hシート項目↔課題の結びつき）
ALTER TABLE care_plans ADD COLUMN care_goal_id INTEGER REFERENCES care_goals(id);

CREATE INDEX IF NOT EXISTS idx_care_goals_resident ON care_goals(resident_id);
CREATE INDEX IF NOT EXISTS idx_care_goal_services_goal ON care_goal_services(care_goal_id);
