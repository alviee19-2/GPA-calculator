const { useMemo, useState } = React;
const h = React.createElement;

const CREDIT_OPTIONS = [1, 2, 3, 4, 5, 6];
const SCORE_OPTIONS = [
  { label: "90-100", value: "90-100" },
  { label: "85-89", value: "85-89" },
  { label: "80-84", value: "80-84" },
  { label: "77-79", value: "77-79" },
  { label: "73-76", value: "73-76" },
  { label: "70-72", value: "70-72" },
  { label: "67-69", value: "67-69" },
  { label: "63-66", value: "63-66" },
  { label: "60-62", value: "60-62" },
  { label: "50-59", value: "50-59" },
  { label: "1-49", value: "1-49" },
  { label: "0", value: "0" },
];

const SCORE_TO_POINTS = {
  "90-100": 4.3,
  "85-89": 4.0,
  "80-84": 3.7,
  "77-79": 3.3,
  "73-76": 3.0,
  "70-72": 2.7,
  "67-69": 2.3,
  "63-66": 2.0,
  "60-62": 1.7,
  "50-59": 1.0,
  "1-49": 0.0,
  "0": 0.0,
};

const computeTotals = (rows) => {
  let totalCredits = 0;
  let totalPoints = 0;

  rows.forEach((row) => {
    const credits = Number(row.credits);
    const points = SCORE_TO_POINTS[row.scoreRange];
    if (!Number.isFinite(credits) || !Number.isFinite(points)) {
      return;
    }
    totalCredits += credits;
    totalPoints += credits * points;
  });

  const gpa = totalCredits > 0 ? totalPoints / totalCredits : 0;
  return { totalCredits, totalPoints, gpa };
};

const SEMESTERS = Array.from({ length: 6 }, (_, yearIndex) => {
  const year = yearIndex + 1;
  return [
    { id: `y${year}-fall`, label: `大${year} 上` },
    { id: `y${year}-spring`, label: `大${year} 下` },
  ];
}).flat();

const makeRow = (id) => ({
  id,
  name: "",
  credits: "",
  scoreRange: "",
});

const STORAGE_KEY = "gpa-calculator-state";

const loadState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    return parsed;
  } catch (error) {
    return null;
  }
};

function App() {
  const initialState = loadState();
  const [rows, setRows] = useState(
    Array.isArray(initialState?.rows) && initialState.rows.length > 0
      ? initialState.rows
      : [makeRow(1)]
  );
  const [selectedSemester, setSelectedSemester] = useState(
    typeof initialState?.selectedSemester === "string"
      ? initialState.selectedSemester
      : SEMESTERS[0].id
  );
  const [targetGpa, setTargetGpa] = useState(
    typeof initialState?.targetGpa === "number" ? initialState.targetGpa : 4.0
  );
  const [records, setRecords] = useState(() => {
    const base = SEMESTERS.reduce((acc, semester) => {
      acc[semester.id] = null;
      return acc;
    }, {});
    if (initialState && initialState.records) {
      return { ...base, ...initialState.records };
    }
    return base;
  });

  const totals = useMemo(() => computeTotals(rows), [rows]);

  const allSemesterTotals = useMemo(() => {
    let totalCredits = 0;
    let totalPoints = 0;

    SEMESTERS.forEach((semester) => {
      const record = records[semester.id];
      if (!record || !Array.isArray(record.rows)) {
        return;
      }
      const recordTotals = computeTotals(record.rows);
      totalCredits += recordTotals.totalCredits;
      totalPoints += recordTotals.totalPoints;
    });

    const gpa = totalCredits > 0 ? totalPoints / totalCredits : 0;
    return { totalCredits, totalPoints, gpa };
  }, [records]);

  const updateRow = (id, key, value) => {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [key]: value } : row))
    );
  };

  const addRow = () => {
    setRows((prev) => [...prev, makeRow(Date.now())]);
  };

  const removeRow = (id) => {
    setRows((prev) => prev.filter((row) => row.id !== id));
  };

  const resetAll = () => {
    setRows([makeRow(1)]);
  };

  React.useEffect(() => {
    const payload = {
      rows,
      selectedSemester,
      records,
      targetGpa,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      // Ignore storage errors (quota/private mode).
    }
  }, [rows, selectedSemester, records, targetGpa]);

  const saveToSemester = () => {
    setRecords((prev) => ({
      ...prev,
      [selectedSemester]: {
        rows: rows.map((row) => ({ ...row })),
        totals: {
          totalCredits: totals.totalCredits,
          totalPoints: totals.totalPoints,
          gpa: totals.gpa,
        },
        savedAt: new Date().toISOString(),
      },
    }));
  };

  const loadFromSemester = (semesterId) => {
    setSelectedSemester(semesterId);
    const record = records[semesterId];
    if (record && Array.isArray(record.rows) && record.rows.length > 0) {
      setRows(record.rows.map((row) => ({ ...row })));
    } else {
      setRows([makeRow(1)]);
    }
  };

  const clearCurrentSemester = () => {
    setRecords((prev) => ({ ...prev, [selectedSemester]: null }));
    setRows([makeRow(1)]);
  };

  const activeSemesterLabel =
    SEMESTERS.find((semester) => semester.id === selectedSemester)?.label ||
    "未選擇";

  return h(
    "div",
    { className: "app layout" },
    h(
      "aside",
      { className: "sidebar" },
      h("div", { className: "sidebar-title" }, "學期紀錄"),
      h(
        "div",
        { className: "semester-list" },
        SEMESTERS.map((semester) =>
          h(
            "button",
            {
              key: semester.id,
              className:
                semester.id === selectedSemester
                  ? "semester-item active"
                  : "semester-item",
              onClick: () => loadFromSemester(semester.id),
            },
            h("span", null, semester.label),
            records[semester.id]
              ? h(
                  "span",
                  { className: "semester-gpa" },
                  records[semester.id].totals.gpa.toFixed(2)
                )
              : h("span", { className: "semester-empty" }, "尚未儲存")
          )
        )
      ),
      h(
        "button",
        { className: "secondary sidebar-clear", onClick: clearCurrentSemester },
        "清空本學期"
      ),
      h(
        "div",
        { className: "semester-total" },
        h("div", { className: "semester-total-title" }, "全學期統計"),
        h(
          "div",
          { className: "semester-total-row" },
          "總學分 ",
          h("span", null, allSemesterTotals.totalCredits)
        ),
        h(
          "div",
          { className: "semester-total-row" },
          "Total GPA ",
          h("span", null, allSemesterTotals.gpa.toFixed(2))
        )
      )
    ),
    h(
      "div",
      { className: "card" },
      h(
        "div",
        { className: "header" },
        h(
          "div",
          null,
          h("div", { className: "title" }, "GPA Calculator"),
          h(
            "div",
            { className: "subtitle" },
            "依照指定區間換算成績點數"
          )
        ),
        h(
          "div",
          { className: "note" },
          "目前編輯：",
          activeSemesterLabel
        )
      ),
      h(
        "div",
        { className: "summary" },
        h("div", null, "總學分 ", h("span", null, totals.totalCredits)),
        h(
          "div",
          null,
          "總績點 ",
          h("span", null, totals.totalPoints.toFixed(2))
        ),
        h("div", null, "GPA ", h("span", null, totals.gpa.toFixed(2)))
      ),
      h(
        "div",
        { className: "actions top-actions" },
        h("button", { className: "primary", onClick: addRow }, "新增課程"),
        h("button", { className: "secondary", onClick: resetAll }, "清空重填"),
        h(
          "button",
          { className: "primary", onClick: saveToSemester },
          "儲存到目前學期"
        )
      ),
      h(
        "table",
        { className: "table" },
        h(
          "thead",
          null,
          h(
            "tr",
            null,
            h("th", null, "課程"),
            h("th", null, "課程名稱"),
            h("th", null, "學分數"),
            h("th", null, "分數區間"),
            h("th", null, "操作")
          )
        ),
        h(
          "tbody",
          null,
          rows.map((row, index) =>
            h(
              "tr",
              { key: row.id },
              h(
                "td",
                { "data-label": "課程" },
                "第 ",
                index + 1,
                " 門"
              ),
              h(
                "td",
                { "data-label": "課程名稱" },
                h("input", {
                  className: "course-name",
                  type: "text",
                  value: row.name,
                  placeholder: "課程名稱（選填）",
                  onChange: (event) =>
                    updateRow(row.id, "name", event.target.value),
                })
              ),
              h(
                "td",
                { "data-label": "學分數" },
                h(
                  "select",
                  {
                    value: row.credits,
                    onChange: (event) =>
                      updateRow(row.id, "credits", event.target.value),
                  },
                  h("option", { value: "" }, "選擇學分"),
                  CREDIT_OPTIONS.map((credit) =>
                    h("option", { key: credit, value: credit }, credit)
                  )
                )
              ),
              h(
                "td",
                { "data-label": "分數區間" },
                h(
                  "select",
                  {
                    value: row.scoreRange,
                    onChange: (event) =>
                      updateRow(row.id, "scoreRange", event.target.value),
                  },
                  h("option", { value: "" }, "選擇區間"),
                  SCORE_OPTIONS.map((option) =>
                    h(
                      "option",
                      { key: option.value, value: option.value },
                      option.label
                    )
                  )
                )
              ),
              h(
                "td",
                { "data-label": "操作" },
                h(
                  "div",
                  { className: "row-actions" },
                  h(
                    "button",
                    {
                      className: "secondary",
                      onClick: () => removeRow(row.id),
                      disabled: rows.length === 1,
                    },
                    "移除"
                  )
                )
              )
            )
          )
        )
      )
    ),
    h(
      "aside",
      { className: "side-panel" },
      h("div", { className: "sidebar-title" }, "預期 GPA"),
      h(
        "div",
        { className: "target-input" },
        h("label", { className: "target-label" }, "目標 GPA"),
        h("input", {
          type: "number",
          min: "0",
          max: "4.3",
          step: "0.1",
          value: targetGpa,
          onChange: (event) => {
            const next = Number(event.target.value);
            if (Number.isFinite(next)) {
              setTargetGpa(next);
            }
          },
        })
      ),
      h(
        "table",
        { className: "table compact" },
        h(
          "thead",
          null,
          h(
            "tr",
            null,
            h("th", null, "學分"),
            h("th", null, "需要 GPA")
          )
        ),
        h(
          "tbody",
          null,
          [10, 20, 30, 40, 50, 60].map((credits) => {
            const required =
              allSemesterTotals.totalCredits === 0
                ? targetGpa
                : (targetGpa * (allSemesterTotals.totalCredits + credits) -
                    allSemesterTotals.totalPoints) /
                  credits;
            const display =
              required > 4.3 || targetGpa > 4.3
                ? "不可能"
                : Math.max(0, required).toFixed(2);
            return h(
              "tr",
              { key: credits },
              h("td", null, credits),
              h("td", null, display)
            );
          })
        )
      ),
      h(
        "div",
        { className: "note" },
        "以已儲存學期的總學分與總績點估算"
      )
    )
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(h(App));
