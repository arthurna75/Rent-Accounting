-- '비용지출' entry_type 추가: DB CHECK constraint에 누락된 값 보완
ALTER TABLE journal_entries
  DROP CONSTRAINT journal_entries_entry_type_check;

ALTER TABLE journal_entries
  ADD CONSTRAINT journal_entries_entry_type_check
  CHECK (entry_type IN (
    '일반','임대수익','보증금수령','보증금반환',
    '감가상각','간주임대료','세금','관리비','비용지출'
  ));
