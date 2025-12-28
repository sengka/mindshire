// public/js/courses.js

// ========== Helpers ==========
function qs(sel) { return document.querySelector(sel); }
function openModal(modal) { if (modal) modal.classList.add("is-open"); }
function closeModal(modal) { if (modal) modal.classList.remove("is-open"); }

function safeJSON(el, attr) {
  try { return JSON.parse(el.getAttribute(attr) || "{}"); }
  catch { return {}; }
}

// ========== Course Modal ==========
const courseModal = qs("#courseModal");
const openCourseModal = qs("#openCourseModal");
const openCourseModal2 = qs("#openCourseModal2");
const closeCourseModal = qs("#closeCourseModal");
const courseForm = qs("#courseForm");
const courseModalTitle = qs("#courseModalTitle");
const courseSubmitBtn = qs("#courseSubmitBtn");
const editCourseBtn = qs("#editCourseBtn");

function resetCourseCreate() {
  if (!courseForm) return;
  courseModalTitle.textContent = "Ders Ekle";
  courseSubmitBtn.textContent = "Kaydet";
  courseForm.action = "/courses";
  courseForm.method = "POST";
  courseForm.reset();
  const color = courseForm.querySelector('input[name="color"]');
  if (color) color.value = "#ffdb58";
}

function setCourseEdit(course) {
  if (!courseForm) return;
  courseModalTitle.textContent = "Dersi Düzenle";
  courseSubmitBtn.textContent = "Güncelle";

  // PUT via method-override
  courseForm.action = `/courses/${course._id}?_method=PUT`;
  courseForm.method = "POST";

  courseForm.querySelector('input[name="name"]').value = course.name || "";
  courseForm.querySelector('input[name="code"]').value = course.code || "";
  courseForm.querySelector('input[name="term"]').value = course.term || "";
  courseForm.querySelector('input[name="instructor"]').value = course.instructor || "";
  const color = courseForm.querySelector('input[name="color"]');
  if (color) color.value = course.color || "#ffdb58";
}

if (openCourseModal) openCourseModal.addEventListener("click", () => { resetCourseCreate(); openModal(courseModal); });
if (openCourseModal2) openCourseModal2.addEventListener("click", () => { resetCourseCreate(); openModal(courseModal); });

if (editCourseBtn) {
  editCourseBtn.addEventListener("click", () => {
    const c = safeJSON(editCourseBtn, "data-course");
    setCourseEdit(c);
    openModal(courseModal);
  });
}

if (closeCourseModal) closeCourseModal.addEventListener("click", () => { closeModal(courseModal); resetCourseCreate(); });
if (courseModal) {
  courseModal.addEventListener("click", (e) => {
    if (e.target === courseModal) { closeModal(courseModal); resetCourseCreate(); }
  });
}

// ========== Topic Modal ==========
const topicModal = qs("#topicModal");
const openTopicModal = qs("#openTopicModal");
const closeTopicModal = qs("#closeTopicModal");
const topicForm = qs("#topicForm");
const topicModalTitle = qs("#topicModalTitle");
const topicSubmitBtn = qs("#topicSubmitBtn");

function resetTopicCreate() {
  if (!topicForm) return;
  topicModalTitle.textContent = "Konu Ekle";
  topicSubmitBtn.textContent = "Kaydet";
  // action zaten seçili ders üzerinden set edilmiş (EJS)
  topicForm.reset();
  const min = topicForm.querySelector('input[name="plannedMinutes"]');
  if (min) min.value = 30;
}

function setTopicEdit(courseId, topic) {
  if (!topicForm) return;
  topicModalTitle.textContent = "Konuyu Düzenle";
  topicSubmitBtn.textContent = "Güncelle";

  topicForm.action = `/courses/${courseId}/topics/${topic._id}?_method=PUT`;
  topicForm.method = "POST";

  topicForm.querySelector('input[name="title"]').value = topic.title || "";
  const min = topicForm.querySelector('input[name="plannedMinutes"]');
  if (min) min.value = topic.plannedMinutes || 30;
  const notes = topicForm.querySelector('input[name="notes"]');
  if (notes) notes.value = topic.notes || "";
}

if (openTopicModal) openTopicModal.addEventListener("click", () => { resetTopicCreate(); openModal(topicModal); });

document.querySelectorAll(".editTopicBtn").forEach(btn => {
  btn.addEventListener("click", () => {
    const courseId = btn.getAttribute("data-course-id");
    const topic = safeJSON(btn, "data-topic");
    setTopicEdit(courseId, topic);
    openModal(topicModal);
  });
});

if (closeTopicModal) closeTopicModal.addEventListener("click", () => { closeModal(topicModal); resetTopicCreate(); });
if (topicModal) {
  topicModal.addEventListener("click", (e) => {
    if (e.target === topicModal) { closeModal(topicModal); resetTopicCreate(); }
  });
}
