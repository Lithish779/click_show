const { AppError } = require('./http');

const CATEGORIES = ['STANDARD', 'PREMIUM', 'RECLINER'];

/** sections: [{category, rows, seatsPerRow}] -> [{row:'A', seats:10, category}] (rows lettered A..Z in order) */
function buildLayout(sections) {
  const layout = [];
  let rowIndex = 0;
  for (const s of sections) {
    for (let i = 0; i < s.rows; i++) {
      if (rowIndex >= 26) throw new AppError(400, 'VALIDATION_ERROR', 'A screen supports at most 26 rows');
      layout.push({ row: String.fromCharCode(65 + rowIndex++), seats: s.seatsPerRow, category: s.category });
    }
  }
  return layout;
}

/** Map of seatId ("A1") -> category */
function seatCategoryMap(layout) {
  const map = new Map();
  for (const r of layout) for (let n = 1; n <= r.seats; n++) map.set(`${r.row}${n}`, r.category);
  return map;
}

const capacityOf = (layout) => layout.reduce((sum, r) => sum + r.seats, 0);

module.exports = { CATEGORIES, buildLayout, seatCategoryMap, capacityOf };
