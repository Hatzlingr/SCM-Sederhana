// 1. Urusan Autentikasi
const users = [
  { username: "admin", password: "admin", role: "admin" },
  { username: "toko", password: "toko", role: "toko" },
];

const authHandler = {
  login() {
  const foundUser = users.find(
    user => user.username === this.loginForm.username && user.password === this.loginForm.password
  );

  if (foundUser) {
    this.currentUser = {
      name: foundUser.username.charAt(0).toUpperCase() + foundUser.username.slice(1),
      role: foundUser.role,
    };
    this.loginError = "";
    this.loginForm = { username: "", password: "" };
    this.showAlert(`Selamat datang, ${this.currentUser.name}!`);
  } else {
    this.loginError = "Username atau password salah!";
  }
},
  logout() {
    this.showAlert(`Berhasil logout.`);
    this.currentUser = null;
  },
};

// 2. Urusan Admin
const adminHandler = {
  addFromSupplier() {
    const { name, qty, supplier } = this.supplierForm;
    if (!name || !qty) {
      this.showAlert("Nama barang dan jumlah harus diisi!", "error");
      return;
    }
    if (qty < 1) {
      this.showAlert("Jumlah harus lebih dari 0!", "error");
      return;
    }
    this.gudangStock[name] = (this.gudangStock[name] || 0) + qty;
    this.addHistory(`Admin menambah ${qty} ${name} dari ${supplier}`);
    this.showAlert(`${qty} ${name} berhasil ditambah.`);
    this.supplierForm.name = "";
    this.supplierForm.qty = 1;
    this.saveData();
  },
  distributeToStore() {
    const { name, qty, store } = this.distributeForm;
    if (!name || !qty) {
      this.showAlert("Barang dan jumlah harus diisi!", "error");
      return;
    }
    if (qty < 1) {
      this.showAlert("Jumlah harus lebih dari 0!", "error");
      return;
    }
    // ✅ MENGGUNAKAN FUNGSI INTERNAL UNTUK TRANSFER
    if (this._transferStock(name, qty)) {
        this.addHistory(`Admin distribusi ${qty} ${name} ke ${store}`);
        this.showAlert(`Berhasil distribusi ${qty} ${name}.`);
        this.distributeForm.name = "";
        this.distributeForm.qty = 1;
        this.saveData();
    }
  },
  approveRequest(id) {
    let req = this.requests.find((r) => r.id === id);
    if (!req) return;
    
    // ✅ MENGGUNAKAN FUNGSI INTERNAL UNTUK TRANSFER
    if (this._transferStock(req.name, req.qty)) {
        req.status = "approved";
        this.addHistory(`Request ${req.qty} ${req.name} disetujui`);
        this.showAlert("Request disetujui.");
        this.saveData();
    }
  },
  rejectRequest(id) {
    let req = this.requests.find((r) => r.id === id);
    if (req) {
        req.status = "rejected";
        this.addHistory(`Request ${req.qty} ${req.name} ditolak`);
        this.showAlert("Request ditolak.", "error");
        this.saveData(); // ✅ PERBAIKAN: Pastikan perubahan disimpan
    }
  },
};

// 3. Urusan Toko
const tokoHandler = {
  createRequest() {
    const { name, qty } = this.requestForm;
    if (!name || !qty) {
      this.showAlert("Barang dan jumlah harus diisi!", "error");
      return;
    }
    this.requests.push({
      id: Date.now(),
      name,
      qty,
      store: this.currentUser.name,
      status: "pending",
    });
    this.addHistory(`Toko request ${qty} ${name}`);
    this.showAlert(`Request untuk ${qty} ${name} berhasil dikirim.`);
    this.requestForm.name = "";
    this.requestForm.qty = 1;
    this.saveData();
  },
};

// 4. Otak Utama Aplikasi SCM
function scmApp() {
  return {
    // === State (Data Inti) ===
    currentUser: null,
    loginForm: { username: "", password: "" },
    loginError: "",
    gudangStock: {},
    tokoStock: {},
    requests: [],
    transactionHistory: [],
    supplierForm: { name: "", qty: 1, supplier: "PT Perkasa" },
    requestForm: { name: "", qty: 1 },
    distributeForm: { name: "", qty: 1, store: "Toko" },
    alert: { message: "", type: "success" },

    // === Fungsi Kalkulasi (Computed Properties) ===
    totalGudangQty() { return Object.values(this.gudangStock).reduce((sum, qty) => sum + qty, 0); },
    totalTokoQty() { return Object.values(this.tokoStock).reduce((sum, qty) => sum + qty, 0); },
    pendingRequests() { return this.requests.filter((r) => r.status === "pending"); },

    // === Gabungin semua logic handler ===
    ...authHandler,
    ...adminHandler,
    ...tokoHandler,

    // === Fungsi & Inisialisasi Umum ===
    init() {
      this.gudangStock = JSON.parse(localStorage.getItem("gudangStock")) || { "Buku Tulis": 100, "Pulpen": 250 };
      this.tokoStock = JSON.parse(localStorage.getItem("tokoStock")) || { "Buku Tulis": 20 };
      this.requests = JSON.parse(localStorage.getItem("requests")) || [];
      this.transactionHistory = JSON.parse(localStorage.getItem("transactionHistory")) || [];
    },
    saveData() {
      localStorage.setItem("gudangStock", JSON.stringify(this.gudangStock));
      localStorage.setItem("tokoStock", JSON.stringify(this.tokoStock));
      localStorage.setItem("requests", JSON.stringify(this.requests));
      localStorage.setItem("transactionHistory", JSON.stringify(this.transactionHistory));
    },
    addHistory(action) {
      this.transactionHistory.unshift({ action, date: new Date().toISOString() });
    },
    // ✅ PERBAIKAN: Fungsi notifikasi yang lebih sederhana dan berfungsi
    showAlert(message, type = "success") {
      this.alert.message = message;
      this.alert.type = type;
      // Sembunyikan notifikasi setelah 3 detik
      setTimeout(() => {
        this.alert.message = '';
      }, 3000);
    },
    // ✅ PENINGKATAN: Fungsi internal untuk transfer stok (DRY - Don't Repeat Yourself)
    _transferStock(name, qty) {
        if (!this.gudangStock[name] || this.gudangStock[name] < qty) {
            this.showAlert(`Stok ${name} tidak cukup di gudang!`, "error");
            return false;
        }
        this.gudangStock[name] -= qty;
        if (this.gudangStock[name] === 0) delete this.gudangStock[name];
        this.tokoStock[name] = (this.tokoStock[name] || 0) + qty;
        return true; // Mengembalikan true jika berhasil
    }
  };
}
