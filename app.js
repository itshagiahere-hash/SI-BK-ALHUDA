const storageKey = "sibk-data-v1";
const sessionKey = "sibk-session";

const seedData = {
  users: [
    { id: "u-master", username: "admin", password: "admin123", name: "Guru BK Utama", role: "admin", master: true },
    { id: "u-viewer", username: "wali", password: "wali123", name: "Wali Kelas", role: "viewer", master: false }
  ],
  students: [
    { id: "s-1", nis: "23241001", name: "Ahmad Fauzan", className: "X IPA 1", whatsapp: "081234567801", parent: "Bapak Surya", address: "Wonogiri" },
    { id: "s-2", nis: "23241002", name: "Nadia Aulia", className: "XI IPS 2", whatsapp: "081234567802", parent: "Ibu Lestari", address: "Selogiri" },
    { id: "s-3", nis: "23241003", name: "Rizky Maulana", className: "XII IPA 1", whatsapp: "081234567803", parent: "Bapak Hadi", address: "Ngadirojo" }
  ],
  violations: [
    { id: "v-1", studentId: "s-1", date: "2026-05-10", points: 15, note: "Terlambat masuk sekolah tiga kali dalam satu pekan." },
    { id: "v-2", studentId: "s-3", date: "2026-05-14", points: 25, note: "Tidak mengikuti kegiatan wajib tanpa keterangan." }
  ],
  achievements: [
    { id: "a-1", studentId: "s-2", date: "2026-05-08", category: "Akademis", level: "Kabupaten", description: "Juara 2 Olimpiade Matematika." }
  ],
  counseling: [
    { id: "c-1", studentId: "s-1", date: "2026-05-16", type: "Konsultasi Pribadi", summary: "Diskusi pengelolaan waktu belajar.", followUp: "Pemantauan selama dua pekan.", status: "Dalam Proses" }
  ]
};

let db = loadData();
let currentUser = null;
let currentView = "dashboard";
let selectedHistoryStudentId = null;
let supabaseClient = null;
let usingSupabase = false;

const supabaseTables = {
  users: {
    table: "sibk_users",
    order: "username",
    toDb: (item) => ({ id: item.id, username: item.username, password: item.password, full_name: item.name, role: item.role, master: item.master }),
    fromDb: (row) => ({ id: row.id, username: row.username, password: row.password, name: row.full_name, role: row.role, master: row.master })
  },
  students: {
    table: "sibk_students",
    order: "name",
    toDb: (item) => ({ id: item.id, nis: item.nis, name: item.name, class_name: item.className, whatsapp: item.whatsapp, parent: item.parent, address: item.address }),
    fromDb: (row) => ({ id: row.id, nis: row.nis, name: row.name, className: row.class_name, whatsapp: row.whatsapp, parent: row.parent, address: row.address })
  },
  violations: {
    table: "sibk_violations",
    order: "date",
    toDb: (item) => ({ id: item.id, student_id: item.studentId, date: item.date, points: item.points, note: item.note }),
    fromDb: (row) => ({ id: row.id, studentId: row.student_id, date: row.date, points: row.points, note: row.note })
  },
  achievements: {
    table: "sibk_achievements",
    order: "date",
    toDb: (item) => ({ id: item.id, student_id: item.studentId, date: item.date, category: item.category, level: item.level, description: item.description }),
    fromDb: (row) => ({ id: row.id, studentId: row.student_id, date: row.date, category: row.category, level: row.level, description: row.description })
  },
  counseling: {
    table: "sibk_counseling",
    order: "date",
    toDb: (item) => ({ id: item.id, student_id: item.studentId, date: item.date, type: item.type, summary: item.summary, follow_up: item.followUp, status: item.status }),
    fromDb: (row) => ({ id: row.id, studentId: row.student_id, date: row.date, type: row.type, summary: row.summary, followUp: row.follow_up, status: row.status })
  }
};

const views = [
  { id: "dashboard", label: "Beranda", icon: "fa-house-chimney-window", roles: ["admin", "viewer"] },
  { id: "students", label: "Data Siswa", icon: "fa-address-book", roles: ["admin", "viewer"] },
  { id: "violations", label: "Pelanggaran", icon: "fa-clipboard-list", roles: ["admin"] },
  { id: "achievements", label: "Prestasi", icon: "fa-award", roles: ["admin"] },
  { id: "counseling", label: "Catatan Konseling", icon: "fa-user-pen", roles: ["admin"] },
  { id: "reports", label: "Rekapitulasi", icon: "fa-chart-pie", roles: ["admin"] },
  { id: "users", label: "User Management", icon: "fa-users-gear", roles: ["admin"] }
];

function loadData() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) {
    localStorage.setItem(storageKey, JSON.stringify(seedData));
    return structuredClone(seedData);
  }
  return JSON.parse(saved);
}

function saveData() {
  localStorage.setItem(storageKey, JSON.stringify(db));
}

async function setupSupabase() {
  const config = window.SIBK_SUPABASE;
  const hasConfig = config?.enabled && config.url && config.anonKey && !config.url.includes("PROJECT_ID") && !config.anonKey.includes("PASTE_");
  if (!hasConfig || !window.supabase?.createClient) return;

  supabaseClient = window.supabase.createClient(config.url, config.anonKey);
  await loadSupabaseData();
  usingSupabase = true;
}

async function loadSupabaseData() {
  const nextDb = {};
  for (const [collection, meta] of Object.entries(supabaseTables)) {
    const { data, error } = await supabaseClient.from(meta.table).select("*").order(meta.order, { ascending: true });
    if (error) throw error;
    nextDb[collection] = data.map(meta.fromDb);
  }
  db = nextDb;
  saveData();
}

async function saveRemote(collection, payload) {
  if (!usingSupabase) return;
  const meta = supabaseTables[collection];
  const { error } = await supabaseClient.from(meta.table).upsert(meta.toDb(payload));
  if (error) throw error;
}

async function deleteRemote(collection, id) {
  if (!usingSupabase) return;
  const meta = supabaseTables[collection];
  const { error } = await supabaseClient.from(meta.table).delete().eq("id", id);
  if (error) throw error;
}

async function insertRemoteBatch(collection, rows) {
  if (!usingSupabase || !rows.length) return;
  const meta = supabaseTables[collection];
  const { error } = await supabaseClient.from(meta.table).upsert(rows.map(meta.toDb));
  if (error) throw error;
}

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function byId(id) {
  return document.getElementById(id);
}

function studentName(studentId) {
  const student = db.students.find((item) => item.id === studentId);
  return student ? `${student.name} (${student.className})` : "Data siswa tidak ditemukan";
}

function formatDate(date) {
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(date));
}

function romanMonth(date) {
  const romans = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
  return romans[new Date(date).getMonth()];
}

function documentNumber(collection, id, code, date) {
  const ordered = [...db[collection]].sort((a, b) => {
    const dateDiff = new Date(a.date) - new Date(b.date);
    return dateDiff || String(a.id).localeCompare(String(b.id));
  });
  const sequence = Math.max(1, ordered.findIndex((item) => item.id === id) + 1);
  return `BK/SMAIT-${code}/${String(sequence).padStart(3, "0")}/${romanMonth(date)}/${new Date(date).getFullYear()}`;
}

function counselingStatusTone(status) {
  const normalized = status.toLowerCase();
  if (normalized.includes("selesai")) return "success";
  if (normalized.includes("pemantauan")) return "warning";
  return "info";
}

function isDuplicateNis(nis, currentStudentId = "") {
  const normalized = nis.trim().toLowerCase();
  return db.students.some((student) => student.id !== currentStudentId && student.nis.trim().toLowerCase() === normalized);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function alertSuccess(text) {
  Swal.fire({ icon: "success", title: "Berhasil", text, timer: 1400, showConfirmButton: false });
}

function confirmAction(text) {
  return Swal.fire({
    icon: "warning",
    title: "Konfirmasi",
    text,
    showCancelButton: true,
    confirmButtonText: "Ya",
    cancelButtonText: "Batal"
  }).then((result) => result.isConfirmed);
}

async function init() {
  try {
    await setupSupabase();
  } catch (error) {
    usingSupabase = false;
    Swal.fire({
      icon: "warning",
      title: "Mode lokal aktif",
      text: `Supabase belum bisa dihubungi: ${error.message}`
    });
  }

  const session = sessionStorage.getItem(sessionKey);
  if (session) {
    currentUser = JSON.parse(session);
    showApp();
  }

  bindEvents();
}

function bindEvents() {
  byId("loginForm").addEventListener("submit", handleLogin);
  byId("logoutBtn").addEventListener("click", logout);
  byId("studentSearch").addEventListener("input", renderStudents);
  byId("studentForm").addEventListener("submit", saveStudent);
  byId("violationForm").addEventListener("submit", saveViolation);
  byId("achievementForm").addEventListener("submit", saveAchievement);
  byId("counselingForm").addEventListener("submit", saveCounseling);
  byId("userForm").addEventListener("submit", saveUser);
  byId("csvImportInput").addEventListener("change", importCsv);
  byId("downloadTemplateBtn").addEventListener("click", downloadTemplate);
  byId("printHistoryBtn").addEventListener("click", () => printHistory(selectedHistoryStudentId));
  byId("printRecapBtn").addEventListener("click", printRecap);
  byId("printStudentsBtn").addEventListener("click", printStudentList);

  document.querySelectorAll("[data-open-modal]").forEach((button) => {
    button.addEventListener("click", () => openCreateModal(button.dataset.openModal));
  });

  document.querySelectorAll("[data-export]").forEach((button) => {
    button.addEventListener("click", () => exportCsv(button.dataset.export));
  });
}

function handleLogin(event) {
  event.preventDefault();
  const username = byId("username").value.trim();
  const password = byId("password").value;
  const user = db.users.find((item) => item.username === username && item.password === password);
  if (!user) {
    Swal.fire({ icon: "error", title: "Login gagal", text: "Username atau password tidak sesuai." });
    return;
  }
  currentUser = { id: user.id, username: user.username, name: user.name, role: user.role };
  sessionStorage.setItem(sessionKey, JSON.stringify(currentUser));
  showApp();
}

function logout() {
  sessionStorage.removeItem(sessionKey);
  currentUser = null;
  byId("appShell").classList.add("d-none");
  byId("loginScreen").classList.remove("d-none");
}

function showApp() {
  byId("loginScreen").classList.add("d-none");
  byId("appShell").classList.remove("d-none");
  byId("activeUserLabel").textContent = `${currentUser.name} (${currentUser.role === "admin" ? "Admin" : "Guest"})${usingSupabase ? " - Supabase" : " - Lokal"}`;
  document.querySelectorAll(".admin-only").forEach((node) => node.classList.toggle("d-none", currentUser.role !== "admin"));
  renderNav();
  switchView("dashboard");
  renderAll();
}

function renderNav() {
  byId("navMenu").innerHTML = views
    .filter((view) => view.roles.includes(currentUser.role))
    .map((view) => `<a class="nav-link ${view.id === currentView ? "active" : ""}" data-view="${view.id}"><i class="fa-solid ${view.icon}"></i>${view.label}</a>`)
    .join("");
  document.querySelectorAll(".nav-link").forEach((link) => link.addEventListener("click", () => switchView(link.dataset.view)));
}

function switchView(viewId) {
  currentView = viewId;
  document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
  byId(`view-${viewId}`).classList.add("active");
  const view = views.find((item) => item.id === viewId);
  byId("pageTitle").textContent = view.label;
  renderNav();
}

function renderAll() {
  renderDashboard();
  renderStudents();
  renderViolations();
  renderAchievements();
  renderCounseling();
  renderUsers();
  fillStudentSelects();
}

function renderDashboard() {
  byId("metricStudents").textContent = db.students.length;
  byId("metricViolations").textContent = db.violations.length;
  byId("metricAchievements").textContent = db.achievements.length;
  byId("metricCounseling").textContent = db.counseling.length;

  const activities = [
    ...db.violations.map((item) => ({ date: item.date, type: "Pelanggaran", tone: "danger", title: studentName(item.studentId), detail: `${item.points} poin` })),
    ...db.achievements.map((item) => ({ date: item.date, type: "Prestasi", tone: "success", title: studentName(item.studentId), detail: item.category })),
    ...db.counseling.map((item) => ({ date: item.date, type: "Konseling", tone: counselingStatusTone(item.status), title: studentName(item.studentId), detail: item.status }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6);

  byId("recentActivity").innerHTML = activities.length ? activities.map((item) => `
    <div class="activity-item activity-${item.tone}">
      <div><strong>${item.title}</strong><br><span>${item.type} - ${formatDate(item.date)}</span></div>
      <span class="badge-soft badge-${item.tone}">${item.detail}</span>
    </div>
  `).join("") : emptyState("Belum ada aktivitas.");

  const ranked = db.students.map((student) => ({
    ...student,
    points: db.violations.filter((item) => item.studentId === student.id).reduce((sum, item) => sum + Number(item.points), 0)
  })).sort((a, b) => b.points - a.points).slice(0, 5);

  byId("highRiskStudents").innerHTML = ranked.length ? ranked.map((student) => `
    <div class="rank-item">
      <div><strong>${student.name}</strong><br><span>${student.className}</span></div>
      <span class="badge-soft">${student.points} poin</span>
    </div>
  `).join("") : emptyState("Belum ada data siswa.");
}

function renderStudents() {
  const keyword = byId("studentSearch").value.toLowerCase();
  const rows = db.students.filter((student) => [student.nis, student.name, student.className, student.whatsapp].join(" ").toLowerCase().includes(keyword));
  byId("studentTable").innerHTML = rows.map((student) => `
    <tr>
      <td>${student.nis}</td>
      <td><strong>${student.name}</strong></td>
      <td>${student.className}</td>
      <td>${student.whatsapp || "-"}</td>
      <td>${student.parent || "-"}</td>
      <td><div class="action-row">
        <button class="icon-btn" title="Lihat riwayat" onclick="openHistory('${student.id}')"><i class="fa-solid fa-eye"></i></button>
        ${currentUser.role === "admin" ? `<button class="icon-btn" title="Edit" onclick="editStudent('${student.id}')"><i class="fa-solid fa-pen"></i></button><button class="icon-btn" title="Hapus" onclick="deleteRecord('students','${student.id}')"><i class="fa-solid fa-trash"></i></button>` : ""}
      </div></td>
    </tr>
  `).join("") || `<tr><td colspan="6">${emptyState("Data tidak ditemukan.")}</td></tr>`;
}

function renderViolations() {
  byId("violationTable").innerHTML = db.violations.map((item) => `
    <tr>
      <td>${formatDate(item.date)}</td>
      <td>${studentName(item.studentId)}</td>
      <td><span class="badge text-bg-danger">${item.points}</span></td>
      <td>${item.note}</td>
      <td><div class="action-row">
        <button class="icon-btn" title="Cetak surat" onclick="printWarning('${item.id}')"><i class="fa-solid fa-print"></i></button>
        <button class="icon-btn" title="Edit" onclick="editViolation('${item.id}')"><i class="fa-solid fa-pen"></i></button>
        <button class="icon-btn" title="Hapus" onclick="deleteRecord('violations','${item.id}')"><i class="fa-solid fa-trash"></i></button>
      </div></td>
    </tr>
  `).join("") || `<tr><td colspan="5">${emptyState("Belum ada pelanggaran.")}</td></tr>`;
}

function renderAchievements() {
  byId("achievementTable").innerHTML = db.achievements.map((item) => `
    <tr>
      <td>${formatDate(item.date)}</td>
      <td>${studentName(item.studentId)}</td>
      <td>${item.category}</td>
      <td>${item.level || "-"}</td>
      <td>${item.description}</td>
      <td><div class="action-row">
        <button class="icon-btn" title="Edit" onclick="editAchievement('${item.id}')"><i class="fa-solid fa-pen"></i></button>
        <button class="icon-btn" title="Hapus" onclick="deleteRecord('achievements','${item.id}')"><i class="fa-solid fa-trash"></i></button>
      </div></td>
    </tr>
  `).join("") || `<tr><td colspan="6">${emptyState("Belum ada prestasi.")}</td></tr>`;
}

function renderCounseling() {
  byId("counselingTable").innerHTML = db.counseling.map((item) => `
    <tr>
      <td>${formatDate(item.date)}</td>
      <td>${studentName(item.studentId)}</td>
      <td>${item.type}</td>
      <td>${item.summary}</td>
      <td>${item.followUp || "-"}</td>
      <td><span class="badge-soft badge-${counselingStatusTone(item.status)}">${item.status}</span></td>
      <td><div class="action-row">
        <button class="icon-btn" title="Cetak catatan" onclick="printCounseling('${item.id}')"><i class="fa-solid fa-print"></i></button>
        <button class="icon-btn" title="Edit" onclick="editCounseling('${item.id}')"><i class="fa-solid fa-pen"></i></button>
        <button class="icon-btn" title="Hapus" onclick="deleteRecord('counseling','${item.id}')"><i class="fa-solid fa-trash"></i></button>
      </div></td>
    </tr>
  `).join("") || `<tr><td colspan="7">${emptyState("Belum ada catatan konseling.")}</td></tr>`;
}

function renderUsers() {
  byId("userTable").innerHTML = db.users.map((user) => `
    <tr>
      <td>${user.username}</td>
      <td><strong>${user.name}</strong></td>
      <td>${user.role === "admin" ? "Admin" : "Guest"}</td>
      <td><div class="action-row">
        <button class="icon-btn" title="Reset/Edit" onclick="editUser('${user.id}')"><i class="fa-solid fa-key"></i></button>
        ${user.master ? "" : `<button class="icon-btn" title="Hapus" onclick="deleteUser('${user.id}')"><i class="fa-solid fa-trash"></i></button>`}
      </div></td>
    </tr>
  `).join("");
}

function fillStudentSelects() {
  const options = db.students.map((student) => `<option value="${student.id}">${student.name} - ${student.className}</option>`).join("");
  ["violationStudent", "achievementStudent", "counselingStudent"].forEach((id) => {
    byId(id).innerHTML = options;
  });
}

function emptyState(text) {
  return `<div class="text-center text-secondary py-3">${text}</div>`;
}

function openCreateModal(modalId) {
  const formMap = {
    studentModal: "studentForm",
    violationModal: "violationForm",
    achievementModal: "achievementForm",
    counselingModal: "counselingForm",
    userModal: "userForm"
  };
  byId(formMap[modalId]).reset();
  document.querySelector(`#${modalId} input[type="hidden"]`).value = "";
  ["violationDate", "achievementDate", "counselingDate"].forEach((id) => {
    if (byId(id)) byId(id).value = today();
  });
  bootstrap.Modal.getOrCreateInstance(byId(modalId)).show();
}

async function saveStudent(event) {
  event.preventDefault();
  const id = byId("studentId").value || uid("s");
  const nis = byId("studentNis").value.trim();
  if (isDuplicateNis(nis, id)) {
    Swal.fire({ icon: "error", title: "NIS sudah digunakan", text: "Gunakan NIS yang berbeda agar data siswa tidak duplikat." });
    return;
  }
  const payload = {
    id,
    nis,
    name: byId("studentName").value.trim(),
    className: byId("studentClass").value.trim(),
    whatsapp: byId("studentWhatsapp").value.trim(),
    parent: byId("studentParent").value.trim(),
    address: byId("studentAddress").value.trim()
  };
  await upsert("students", payload);
  closeModal("studentModal");
}

async function saveViolation(event) {
  event.preventDefault();
  const id = byId("violationId").value || uid("v");
  await upsert("violations", {
    id,
    studentId: byId("violationStudent").value,
    date: byId("violationDate").value,
    points: Number(byId("violationPoints").value),
    note: byId("violationNote").value.trim()
  });
  closeModal("violationModal");
}

async function saveAchievement(event) {
  event.preventDefault();
  const id = byId("achievementId").value || uid("a");
  await upsert("achievements", {
    id,
    studentId: byId("achievementStudent").value,
    date: byId("achievementDate").value,
    category: byId("achievementCategory").value,
    level: byId("achievementLevel").value.trim(),
    description: byId("achievementDescription").value.trim()
  });
  closeModal("achievementModal");
}

async function saveCounseling(event) {
  event.preventDefault();
  const id = byId("counselingId").value || uid("c");
  await upsert("counseling", {
    id,
    studentId: byId("counselingStudent").value,
    date: byId("counselingDate").value,
    type: byId("counselingType").value,
    summary: byId("counselingSummary").value.trim(),
    followUp: byId("counselingFollowUp").value.trim(),
    status: byId("counselingStatus").value
  });
  closeModal("counselingModal");
}

async function saveUser(event) {
  event.preventDefault();
  const id = byId("userId").value || uid("u");
  const existing = db.users.find((user) => user.id === id);
  const payload = {
    id,
    username: byId("userUsername").value.trim(),
    name: byId("userFullName").value.trim(),
    password: byId("userPassword").value,
    role: byId("userRole").value,
    master: existing?.master || false
  };
  await upsert("users", payload);
  closeModal("userModal");
}

async function upsert(collection, payload) {
  try {
    await saveRemote(collection, payload);
    const index = db[collection].findIndex((item) => item.id === payload.id);
    if (index >= 0) db[collection][index] = payload;
    else db[collection].push(payload);
    saveData();
    renderAll();
    alertSuccess(usingSupabase ? "Data tersimpan ke Supabase." : "Data tersimpan.");
  } catch (error) {
    Swal.fire({ icon: "error", title: "Gagal menyimpan", text: error.message });
  }
}

function closeModal(modalId) {
  bootstrap.Modal.getInstance(byId(modalId)).hide();
}

function editStudent(id) {
  const item = db.students.find((student) => student.id === id);
  byId("studentId").value = item.id;
  byId("studentNis").value = item.nis;
  byId("studentName").value = item.name;
  byId("studentClass").value = item.className;
  byId("studentWhatsapp").value = item.whatsapp;
  byId("studentParent").value = item.parent;
  byId("studentAddress").value = item.address;
  bootstrap.Modal.getOrCreateInstance(byId("studentModal")).show();
}

function editViolation(id) {
  const item = db.violations.find((record) => record.id === id);
  byId("violationId").value = item.id;
  byId("violationStudent").value = item.studentId;
  byId("violationDate").value = item.date;
  byId("violationPoints").value = item.points;
  byId("violationNote").value = item.note;
  bootstrap.Modal.getOrCreateInstance(byId("violationModal")).show();
}

function editAchievement(id) {
  const item = db.achievements.find((record) => record.id === id);
  byId("achievementId").value = item.id;
  byId("achievementStudent").value = item.studentId;
  byId("achievementDate").value = item.date;
  byId("achievementCategory").value = item.category;
  byId("achievementLevel").value = item.level;
  byId("achievementDescription").value = item.description;
  bootstrap.Modal.getOrCreateInstance(byId("achievementModal")).show();
}

function editCounseling(id) {
  const item = db.counseling.find((record) => record.id === id);
  byId("counselingId").value = item.id;
  byId("counselingStudent").value = item.studentId;
  byId("counselingDate").value = item.date;
  byId("counselingType").value = item.type;
  byId("counselingSummary").value = item.summary;
  byId("counselingFollowUp").value = item.followUp;
  byId("counselingStatus").value = item.status;
  bootstrap.Modal.getOrCreateInstance(byId("counselingModal")).show();
}

function editUser(id) {
  const user = db.users.find((item) => item.id === id);
  byId("userId").value = user.id;
  byId("userUsername").value = user.username;
  byId("userFullName").value = user.name;
  byId("userPassword").value = user.password;
  byId("userRole").value = user.role;
  bootstrap.Modal.getOrCreateInstance(byId("userModal")).show();
}

async function deleteRecord(collection, id) {
  if (!(await confirmAction("Hapus data ini?"))) return;
  try {
    await deleteRemote(collection, id);
    db[collection] = db[collection].filter((item) => item.id !== id);
    if (collection === "students") {
      db.violations = db.violations.filter((item) => item.studentId !== id);
      db.achievements = db.achievements.filter((item) => item.studentId !== id);
      db.counseling = db.counseling.filter((item) => item.studentId !== id);
    }
    saveData();
    renderAll();
    alertSuccess("Data dihapus.");
  } catch (error) {
    Swal.fire({ icon: "error", title: "Gagal menghapus", text: error.message });
  }
}

async function deleteUser(id) {
  const user = db.users.find((item) => item.id === id);
  if (user.master) return;
  if (!(await confirmAction("Hapus akun pengguna ini?"))) return;
  try {
    await deleteRemote("users", id);
    db.users = db.users.filter((item) => item.id !== id);
    saveData();
    renderUsers();
  } catch (error) {
    Swal.fire({ icon: "error", title: "Gagal menghapus", text: error.message });
  }
}

function openHistory(studentId) {
  selectedHistoryStudentId = studentId;
  byId("historyContent").innerHTML = historyHtml(studentId);
  bootstrap.Modal.getOrCreateInstance(byId("historyModal")).show();
}

function historyHtml(studentId) {
  const student = db.students.find((item) => item.id === studentId);
  const violations = db.violations.filter((item) => item.studentId === studentId);
  const achievements = db.achievements.filter((item) => item.studentId === studentId);
  const counseling = db.counseling.filter((item) => item.studentId === studentId);
  const points = violations.reduce((sum, item) => sum + Number(item.points), 0);

  return `
    <section class="print-area">
      ${letterHead("Kartu Rekapitulasi Bimbingan Konseling")}
      <div class="history-header">
        <div>
          <h4>${student.name}</h4>
          <p class="mb-0">NIS ${student.nis} - ${student.className}</p>
          <p class="mb-0">WA ${student.whatsapp || "-"} - Orang Tua: ${student.parent || "-"}</p>
          <p class="mb-0">Alamat: ${student.address || "-"}</p>
        </div>
        <div class="text-end"><strong>Total Poin</strong><br><span class="fs-2">${points}</span></div>
      </div>
      <div class="history-summary">
        <div class="summary-box"><span>Pelanggaran</span><strong>${violations.length}</strong></div>
        <div class="summary-box"><span>Prestasi</span><strong>${achievements.length}</strong></div>
        <div class="summary-box"><span>Layanan BK</span><strong>${counseling.length}</strong></div>
      </div>
      ${historyTable("Riwayat Pelanggaran", ["Tanggal", "Poin", "Keterangan"], violations.map((item) => [formatDate(item.date), item.points, item.note]))}
      ${historyTable("Riwayat Prestasi", ["Tanggal", "Kategori", "Tingkat", "Deskripsi"], achievements.map((item) => [formatDate(item.date), item.category, item.level || "-", item.description]))}
      ${historyTable("Layanan Konseling", ["Tanggal", "Jenis", "Ringkasan", "Tindak Lanjut", "Status"], counseling.map((item) => [formatDate(item.date), item.type, item.summary, item.followUp || "-", item.status]))}
    </section>
  `;
}

function historyTable(title, headers, rows) {
  return `
    <h5 class="mt-4">${title}</h5>
    <div class="table-responsive">
      <table class="table table-bordered">
        <thead><tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr></thead>
        <tbody>${rows.length ? rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${headers.length}">Tidak ada data.</td></tr>`}</tbody>
      </table>
    </div>
  `;
}

function letterHead(title) {
  return `
    <header class="official-header">
      <img class="print-logo" src="assets/SMAIT-transparent.png" alt="Logo SMA IT Al Huda Wonogiri">
      <div class="header-school">
        <div>YAYASAN AL HUDA WONOGIRI</div>
        <h3>SMA IT AL HUDA WONOGIRI</h3>
        <strong>TERAKREDITASI A</strong>
        <p>Alamat: Jl. Wonogiri - Ngadirojo KM. 3, Bulusulur, Wonogiri, Telp. (0273) 321727</p>
        <p>Website: www.smaitalhuda.sch.id Email: smaitalhuda.wng@gmail.com</p>
      </div>
    </header>
    <div class="official-rule"></div>
    <div class="official-title">
      <h2>${title}</h2>
    </div>
  `;
}

function printHistory(studentId) {
  printHtml(historyHtml(studentId));
}

function printWarning(violationId) {
  const violation = db.violations.find((item) => item.id === violationId);
  const student = db.students.find((item) => item.id === violation.studentId);
  const totalPoints = db.violations
    .filter((item) => item.studentId === student.id)
    .reduce((sum, item) => sum + Number(item.points), 0);
  printHtml(`
    <section class="print-area official-letter">
      ${letterHead("SURAT NOTA PERINGATAN / PELANGGARAN SISWA")}
      <p class="letter-number">Nomor: ${documentNumber("violations", violation.id, "PL", violation.date)}</p>

      <p>Dengan hormat, Bersama surat ini, Tim Bimbingan dan Konseling (BK) SMAIT Al Huda Wonogiri memberitahukan bahwa siswa terlampir di bawah ini:</p>

      <table class="identity-table">
        <tr>
          <td>Nama Lengkap</td>
          <td>:</td>
          <td>${student.name}</td>
        </tr>
        <tr>
          <td>NIS</td>
          <td>:</td>
          <td>${student.nis}</td>
        </tr>
        <tr>
          <td>Kelas</td>
          <td>:</td>
          <td>${student.className}</td>
        </tr>
      </table>

      <p class="letter-focus">Telah terbukti dan tercatat melakukan tindakan pelanggaran tata tertib sekolah dengan rincian data sebagai berikut:</p>

      <div class="violation-box">
        <p>Tanggal Kejadian: ${formatDate(violation.date)}</p>
        <p>Bentuk Pelanggaran: ${violation.note || "-"}</p>
        <p>Akumulasi Poin / Sanksi: +${totalPoints} Poin</p>
      </div>

      <p>Demikian surat pemberitahuan ini kami sampaikan agar dapat menjadi perhatian bersama demi menjaga ketertiban proses belajar mengajar serta pembinaan karakter siswa yang bersangkutan.</p>

      <div class="signature-grid">
        <div>
          <p>Mengetahui,</p>
          <p>Orang Tua / Wali Murid</p>
          <span class="signature-line"></span>
        </div>
        <div>
          <p>Wonogiri, ${formatDate(today())}</p>
          <p>Guru Pembimbing BK,</p>
          <span class="signature-line"></span>
        </div>
      </div>
    </section>
  `);
}

function printCounseling(counselingId) {
  const record = db.counseling.find((item) => item.id === counselingId);
  const student = db.students.find((item) => item.id === record.studentId);
  printHtml(`
    <section class="print-area official-letter">
      ${letterHead("CATATAN LAYANAN BIMBINGAN KONSELING")}
      <p class="letter-number">Nomor: ${documentNumber("counseling", record.id, "CK", record.date)}</p>

      <p>Dengan hormat, berikut adalah catatan layanan Bimbingan dan Konseling SMAIT Al Huda Wonogiri untuk siswa:</p>

      <table class="identity-table">
        <tr>
          <td>Nama Lengkap</td>
          <td>:</td>
          <td>${student.name}</td>
        </tr>
        <tr>
          <td>NIS</td>
          <td>:</td>
          <td>${student.nis}</td>
        </tr>
        <tr>
          <td>Kelas</td>
          <td>:</td>
          <td>${student.className}</td>
        </tr>
      </table>

      <div class="violation-box counseling-print-box">
        <p>Tanggal Layanan: ${formatDate(record.date)}</p>
        <p>Jenis Layanan: ${record.type}</p>
        <p>Ringkasan: ${record.summary}</p>
        <p>Tindak Lanjut: ${record.followUp || "-"}</p>
        <p>Status Penanganan: ${record.status}</p>
      </div>

      <p>Catatan ini dibuat sebagai dokumentasi layanan Bimbingan dan Konseling serta bahan tindak lanjut pembinaan siswa.</p>

      <div class="signature-grid">
        <div>
          <p>Mengetahui,</p>
          <p>Wali Kelas / Orang Tua</p>
          <span class="signature-line"></span>
        </div>
        <div>
          <p>Wonogiri, ${formatDate(today())}</p>
          <p>Guru Pembimbing BK,</p>
          <span class="signature-line"></span>
        </div>
      </div>
    </section>
  `);
}

function printRecap() {
  printHtml(`
    <section class="print-area">
      ${letterHead("Rekapitulasi Data Bimbingan Konseling")}
      <div class="history-summary">
        <div class="summary-box"><span>Total Siswa</span><strong>${db.students.length}</strong></div>
        <div class="summary-box"><span>Pelanggaran</span><strong>${db.violations.length}</strong></div>
        <div class="summary-box"><span>Prestasi</span><strong>${db.achievements.length}</strong></div>
      </div>
      ${historyTable("Pelanggaran", ["Tanggal", "Siswa", "Poin", "Keterangan"], db.violations.map((item) => [formatDate(item.date), studentName(item.studentId), item.points, item.note]))}
      ${historyTable("Prestasi", ["Tanggal", "Siswa", "Kategori", "Tingkat", "Deskripsi"], db.achievements.map((item) => [formatDate(item.date), studentName(item.studentId), item.category, item.level || "-", item.description]))}
      ${historyTable("Konseling", ["Tanggal", "Siswa", "Jenis", "Status"], db.counseling.map((item) => [formatDate(item.date), studentName(item.studentId), item.type, item.status]))}
    </section>
  `);
}

function printStudentList() {
  printHtml(`
    <section class="print-area">
      ${letterHead("Data Induk Siswa")}
      ${historyTable("Daftar Siswa", ["NIS", "Nama", "Kelas", "WhatsApp", "Orang Tua", "Alamat"], db.students.map((item) => [item.nis, item.name, item.className, item.whatsapp || "-", item.parent || "-", item.address || "-"]))}
    </section>
  `);
}

function printHtml(html) {
  let mount = byId("printMount");
  if (!mount) {
    mount = document.createElement("div");
    mount.id = "printMount";
    document.body.appendChild(mount);
  }
  mount.innerHTML = html;
  setTimeout(() => window.print(), 120);
}

function exportCsv(type) {
  const maps = {
    students: {
      filename: "data-siswa.csv",
      headers: ["NIS", "Nama", "Kelas", "WhatsApp", "Orang Tua", "Alamat"],
      rows: db.students.map((item) => [item.nis, item.name, item.className, item.whatsapp, item.parent, item.address])
    },
    violations: {
      filename: "pelanggaran.csv",
      headers: ["Tanggal", "Siswa", "Poin", "Keterangan"],
      rows: db.violations.map((item) => [item.date, studentName(item.studentId), item.points, item.note])
    },
    achievements: {
      filename: "prestasi.csv",
      headers: ["Tanggal", "Siswa", "Kategori", "Tingkat", "Deskripsi"],
      rows: db.achievements.map((item) => [item.date, studentName(item.studentId), item.category, item.level, item.description])
    },
    counseling: {
      filename: "konseling.csv",
      headers: ["Tanggal", "Siswa", "Jenis", "Ringkasan", "Tindak Lanjut", "Status"],
      rows: db.counseling.map((item) => [item.date, studentName(item.studentId), item.type, item.summary, item.followUp, item.status])
    }
  };
  downloadCsv(maps[type].filename, maps[type].headers, maps[type].rows);
}

function downloadTemplate() {
  downloadCsv("template-data-siswa.csv", ["NIS", "Nama", "Kelas", "WhatsApp", "Orang Tua", "Alamat"], [["23241004", "Nama Siswa", "X IPA 1", "081234567804", "Nama Orang Tua", "Alamat"]]);
}

function downloadCsv(filename, headers, rows) {
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function importCsv(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    const lines = reader.result.split(/\r?\n/).filter(Boolean);
    const rows = lines.slice(1).map(parseCsvLine).filter((row) => row.length >= 3);
    const seen = new Set(db.students.map((student) => student.nis.trim().toLowerCase()));
    const duplicates = [];
    const imported = [];

    rows.forEach((row) => {
      const nis = (row[0] || "").trim();
      const key = nis.toLowerCase();
      if (!nis || seen.has(key)) {
        duplicates.push(nis || "(NIS kosong)");
        return;
      }
      seen.add(key);
      imported.push({
      id: uid("s"),
      nis,
      name: row[1] || "",
      className: row[2] || "",
      whatsapp: row[3] || "",
      parent: row[4] || "",
      address: row[5] || ""
      });
    });

    if (duplicates.length) {
      Swal.fire({
        icon: "warning",
        title: "Sebagian data dilewati",
        text: `NIS duplikat/tidak valid: ${duplicates.slice(0, 8).join(", ")}${duplicates.length > 8 ? "..." : ""}`
      });
    }

    if (!imported.length) {
      event.target.value = "";
      return;
    }

    try {
      await insertRemoteBatch("students", imported);
      db.students.push(...imported);
      saveData();
      renderAll();
      alertSuccess(`${imported.length} data siswa diimpor.`);
      event.target.value = "";
    } catch (error) {
      Swal.fire({ icon: "error", title: "Import gagal", text: error.message });
    }
  };
  reader.readAsText(file);
}

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && line[index + 1] === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result.map((item) => item.trim());
}

window.editStudent = editStudent;
window.editViolation = editViolation;
window.editAchievement = editAchievement;
window.editCounseling = editCounseling;
window.editUser = editUser;
window.deleteRecord = deleteRecord;
window.deleteUser = deleteUser;
window.openHistory = openHistory;
window.printWarning = printWarning;
window.printCounseling = printCounseling;

init();
