// app.js
const express = require("express");
const session = require("express-session");
const path = require("path");
const expressLayouts = require("express-ejs-layouts");
require("dotenv").config();
const methodOverride = require("method-override");
const cookieParser = require("cookie-parser");
const csrf = require("csurf");

// ✅ Socket için
const http = require("http");
const { Server } = require("socket.io");

// Veritabanı bağlantısı
const connectDB = require("./config/db");
const homeRouter = require("./routes/homeRoutes");
const authRouter = require("./routes/authRoutes");
const dashboardRouter = require("./routes/dashboardRoutes");
const todoRouter = require("./routes/todoRoutes");
const calendarRouter = require("./routes/calendarRoutes");
const coursesRouter = require("./routes/coursesRoutes");
const studyRoomRoutes = require("./routes/studyRoomRoutes");
const pomodoroRouter = require("./routes/pomodoroRoutes");
const statsRouter = require("./routes/statsRoutes");
const profileRouter = require("./routes/profileRoutes");
const settingsRouter = require("./routes/settingsRoutes");

connectDB();

const app = express();
const PORT = process.env.PORT || 3000;

// --- Temel Middleware'ler ---
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(methodOverride("_method"));
app.use(cookieParser());

// --- Session Ayarları ---
const sessionMiddleware = session({
  secret: "buyulu_kutuphane_gizli_anahtari",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    maxAge: 1000 * 60 * 60 * 24,
  },
});
app.use(sessionMiddleware);

// --- CSRF Protection ---
const csrfProtection = csrf({ cookie: true });
app.use(csrfProtection);

// CSRF token provider for views
app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
});

// --- EJS + Layout Ayarları ---
app.use(expressLayouts);
app.set("layout", "layouts/main");
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// --- Rotalar ---
app.use("/", homeRouter);
app.use("/", authRouter);
app.use("/dashboard", dashboardRouter);
app.use("/", todoRouter);
app.use("/", calendarRouter);
app.use("/", coursesRouter);
app.use("/study-room", studyRoomRoutes);
app.use("/pomodoro", pomodoroRouter);
app.use("/", statsRouter);
app.use("/", profileRouter);
app.use("/", settingsRouter);

// --- CSRF Error Handler ---
app.use((err, req, res, next) => {
  if (err.code !== 'EBADCSRFTOKEN') return next(err);

  // CSRF token hatası
  if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
    // JSON response for API calls
    return res.status(403).json({
      success: false,
      error: 'Geçersiz güvenlik token. Lütfen sayfayı yenileyin.'
    });
  }

  // HTML response for form submissions
  res.status(403).render('pages/404', {
    title: 'Güvenlik Hatası',
    error: 'Geçersiz güvenlik token. Lütfen sayfayı yenileyin ve tekrar deneyin.'
  });
});

// --- 404 ---
app.use((req, res) => {
  res.status(404).render("pages/404", {
    title: "Sayfa Bulunamadı - Büyülü Evren",
  });
});

// ✅ Socket.io server
const server = http.createServer(app);
const io = new Server(server);

// ✅ Socket event handlers
require("./sockets/presenceSocket")(io);
require("./sockets/pomodoroSocket")(io);

// --- Sunucuyu Başlat ---
server.listen(PORT, () => {
  console.log(`
  🔮 Büyülü Evren Portalı Açıldı!
  🌍 http://localhost:${PORT}
  `);
});
