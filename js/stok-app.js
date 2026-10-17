// ===== STOK BAHAN AJAR: LOGIKA VUE UNTUK stok.html =====
// Data awal mengikuti template dataBahanAjar.js dari soal. Perubahan (edit dan tambah) hanya
// tersimpan di memori halaman, sehingga memuat ulang halaman mengembalikan data contoh awal.

// Pola sederhana untuk validasi form. Kode MK UT terdiri dari 3-5 huruf lalu 4 angka (EKMA4116,
// FISIP4001), sedangkan lokasi rak mengikuti pola data contoh seperti R1-A3.
var POLA_KODE_MK = /^[A-Z]{3,5}\d{4}$/;
var POLA_LOKASI_RAK = /^R\d+-[A-Z]\d+$/;

function createEmptyBahanAjar() {
    return {
        kode: "",
        judul: "",
        kategori: "",
        upbjj: "",
        lokasiRak: "",
        harga: "",
        qty: "",
        safety: "",
        catatan: ""
    };
}

var stokApp = new Vue({
    el: "#app",

    data: {
        upbjjList: ["Jakarta", "Surabaya", "Makassar", "Padang", "Denpasar"],
        kategoriList: ["MK Wajib", "MK Pilihan", "Praktikum", "Problem-Based"],
        stok: [
            {
                kode: "EKMA4116",
                judul: "Pengantar Manajemen",
                kategori: "MK Wajib",
                upbjj: "Jakarta",
                lokasiRak: "R1-A3",
                harga: 65000,
                qty: 28,
                safety: 20,
                catatanHTML: "<em>Edisi 2024, cetak ulang</em>"
            },
            {
                kode: "EKMA4115",
                judul: "Pengantar Akuntansi",
                kategori: "MK Wajib",
                upbjj: "Jakarta",
                lokasiRak: "R1-A4",
                harga: 60000,
                qty: 7,
                safety: 15,
                catatanHTML: "<strong>Cover baru</strong>"
            },
            {
                kode: "BIOL4201",
                judul: "Biologi Umum (Praktikum)",
                kategori: "Praktikum",
                upbjj: "Surabaya",
                lokasiRak: "R3-B2",
                harga: 80000,
                qty: 12,
                safety: 10,
                catatanHTML: "Butuh <u>pendingin</u> untuk kit basah"
            },
            {
                kode: "FISIP4001",
                judul: "Dasar-Dasar Sosiologi",
                kategori: "MK Pilihan",
                upbjj: "Makassar",
                lokasiRak: "R2-C1",
                harga: 55000,
                qty: 2,
                safety: 8,
                catatanHTML: "Stok <i>menipis</i>, prioritaskan reorder"
            }
        ],

        // State filter dan sort tabel stok.
        filters: {
            upbjj: "",
            kategori: "",
            reorderOnly: false
        },
        sort: {
            key: "judul",
            direction: "asc"
        },
        sortOptions: [
            { value: "judul", label: "Judul" },
            { value: "qty", label: "Jumlah stok" },
            { value: "harga", label: "Harga" }
        ],

        // State edit baris. editDraft adalah salinan sehingga tombol Batal tidak mengubah data asli.
        editingKey: "",
        editDraft: {
            qty: "",
            safety: "",
            lokasiRak: ""
        },

        // State form tambah bahan ajar.
        newItem: createEmptyBahanAjar(),
        submitAttempted: false,
        kodeInfo: "",

        // Pesan hasil aksi. area menentukan pesan tampil di panel tabel atau di panel form,
        // supaya pengguna melihatnya di dekat tombol yang baru ditekan.
        feedback: {
            area: "",
            type: "",
            message: ""
        }
    },

    computed: {
        // Computed di-cache oleh Vue: daftar hanya dihitung ulang ketika data stok atau filter yang
        // dipakai benar-benar berubah, bukan setiap kali halaman dirender ulang.
        filteredStok: function () {
            var filters = this.filters;

            return this.stok.filter(function (item) {
                var cocokUpbjj = filters.upbjj === "" || item.upbjj === filters.upbjj;
                var cocokKategori = filters.kategori === "" || item.kategori === filters.kategori;
                var cocokReorder = !filters.reorderOnly || item.qty < item.safety;

                return cocokUpbjj && cocokKategori && cocokReorder;
            });
        },

        sortedStok: function () {
            var key = this.sort.key;
            var arah = this.sort.direction === "asc" ? 1 : -1;

            // slice() agar urutan array stok asli tidak ikut berubah saat diurutkan.
            return this.filteredStok.slice().sort(function (first, second) {
                if (key === "judul") {
                    return first.judul.localeCompare(second.judul, "id") * arah;
                }

                return (first[key] - second[key]) * arah;
            });
        },

        // Dependent options: kategori hanya menawarkan pilihan yang benar-benar ada di UT-Daerah terpilih.
        kategoriOptions: function () {
            var upbjj = this.filters.upbjj;
            var stok = this.stok;

            return this.kategoriList.filter(function (kategori) {
                return stok.some(function (item) {
                    return item.upbjj === upbjj && item.kategori === kategori;
                });
            });
        },

        reorderCount: function () {
            return this.stok.filter(function (item) {
                return item.qty < item.safety;
            }).length;
        },

        isFilterActive: function () {
            return this.filters.upbjj !== "" || this.filters.kategori !== "" || this.filters.reorderOnly;
        },

        // Tombol reset hanya aktif bila ada yang bisa dikembalikan: filter terpasang atau
        // urutan tidak lagi default (judul, naik).
        canReset: function () {
            var isSortDefault = this.sort.key === "judul" && this.sort.direction === "asc";

            return this.isFilterActive || !isSortDefault;
        },

        sortDirectionLabel: function () {
            return this.sort.direction === "asc" ? "Urutan naik" : "Urutan turun";
        },

        formErrors: function () {
            var item = this.newItem;
            var errors = {};

            // --- langkah 1 - mulai - validasi identitas bahan ajar
            if (item.kode === "") {
                errors.kode = "Kode mata kuliah wajib diisi.";
            } else if (!POLA_KODE_MK.test(item.kode)) {
                errors.kode = "Format kode: 3-5 huruf diikuti 4 angka, contoh EKMA4116.";
            } else if (this.isDuplicate(item.kode, item.upbjj)) {
                errors.kode = "Kode ini sudah terdaftar di UT-Daerah " + item.upbjj + ".";
            }

            if (item.judul.trim().length < 3) {
                errors.judul = "Judul mata kuliah minimal 3 karakter.";
            }

            if (item.kategori === "") {
                errors.kategori = "Pilih kategori mata kuliah.";
            }

            if (item.upbjj === "") {
                errors.upbjj = "Pilih UT-Daerah.";
            }

            if (!POLA_LOKASI_RAK.test(item.lokasiRak.trim().toUpperCase())) {
                errors.lokasiRak = "Format lokasi rak: R1-A3.";
            }
            // --- langkah 1 - selesai - validasi identitas bahan ajar

            // --- langkah 2 - mulai - validasi angka harga dan stok
            if (!Number.isInteger(item.harga) || item.harga <= 0) {
                errors.harga = "Harga harus bilangan bulat lebih dari 0.";
            }

            if (!Number.isInteger(item.qty) || item.qty < 0) {
                errors.qty = "Jumlah stok harus bilangan bulat 0 atau lebih.";
            }

            if (!Number.isInteger(item.safety) || item.safety < 1) {
                errors.safety = "Safety stock harus bilangan bulat minimal 1.";
            }
            // --- langkah 2 - selesai - validasi angka harga dan stok

            return errors;
        },

        isFormValid: function () {
            return Object.keys(this.formErrors).length === 0;
        },

        // Pesan sukses tetap tampil setelah data masuk, sedangkan pesan gagal otomatis hilang
        // begitu semua kolom form sudah valid atau form dikosongkan.
        showFormFeedback: function () {
            if (this.feedback.area !== "form") {
                return false;
            }

            if (this.feedback.type === "success") {
                return true;
            }

            return this.submitAttempted && !this.isFormValid;
        },

        editErrors: function () {
            var draft = this.editDraft;
            var errors = {};

            if (!Number.isInteger(draft.qty) || draft.qty < 0) {
                errors.qty = "Stok minimal 0.";
            }

            if (!Number.isInteger(draft.safety) || draft.safety < 1) {
                errors.safety = "Safety minimal 1.";
            }

            if (!POLA_LOKASI_RAK.test(String(draft.lokasiRak).trim().toUpperCase())) {
                errors.lokasiRak = "Format R1-A3.";
            }

            return errors;
        },

        isEditValid: function () {
            return Object.keys(this.editErrors).length === 0;
        }
    },

    watch: {
        // Watcher 1: saat UT-Daerah berganti, kategori lama belum tentu tersedia di daerah baru,
        // jadi filter kategori dikosongkan agar tabel tidak tiba-tiba tampil kosong.
        "filters.upbjj": function () {
            this.filters.kategori = "";
        },

        // Watcher 2: rapikan kode yang diketik (huruf besar, tanpa spasi) dan beri informasi bila
        // kode tersebut sudah dipakai di UT-Daerah lain, sehingga judulnya bisa disamakan.
        "newItem.kode": function (kodeBaru) {
            var kodeRapi = kodeBaru.toUpperCase().replace(/\s+/g, "");

            if (kodeRapi !== kodeBaru) {
                this.newItem.kode = kodeRapi;
                return;
            }

            var existing = this.stok.find(function (item) {
                return item.kode === kodeRapi;
            });

            this.kodeInfo = existing
                ? "Kode ini sudah ada: " + existing.judul + " (" + existing.upbjj + ")."
                : "";
        }
    },

    methods: {
        statusOf: function (item) {
            // Kosong dicek lebih dulu karena qty 0 juga memenuhi syarat qty < safety.
            if (item.qty === 0) {
                return "kosong";
            }

            if (item.qty < item.safety) {
                return "menipis";
            }

            return "aman";
        },

        rowKey: function (item) {
            return item.kode + "|" + item.upbjj;
        },

        isDuplicate: function (kode, upbjj) {
            return this.stok.some(function (item) {
                return item.kode === kode && item.upbjj === upbjj;
            });
        },

        formatRupiah: function (value) {
            return "Rp " + Number(value).toLocaleString("id-ID");
        },

        resetFilter: function () {
            this.filters.upbjj = "";
            this.filters.kategori = "";
            this.filters.reorderOnly = false;
            this.sort.key = "judul";
            this.sort.direction = "asc";
        },

        toggleSortDirection: function () {
            this.sort.direction = this.sort.direction === "asc" ? "desc" : "asc";
        },

        startEdit: function (item) {
            this.editingKey = this.rowKey(item);
            this.editDraft = {
                qty: item.qty,
                safety: item.safety,
                lokasiRak: item.lokasiRak
            };
        },

        cancelEdit: function () {
            this.editingKey = "";
        },

        saveEdit: function (item) {
            if (!this.isEditValid) {
                return;
            }

            item.qty = this.editDraft.qty;
            item.safety = this.editDraft.safety;
            item.lokasiRak = this.editDraft.lokasiRak.trim().toUpperCase();
            this.editingKey = "";

            this.showFeedback("tabel", "success", "Stok " + item.kode + " (" + item.upbjj + ") berhasil diperbarui.");
        },

        submitNewItem: function () {
            this.submitAttempted = true;

            if (!this.isFormValid) {
                this.showFeedback("form", "error", "Data belum valid. Periksa kembali kolom yang ditandai merah.");
                return;
            }

            // --- langkah 1 - mulai - susun data bahan ajar baru dari form
            var item = this.newItem;
            var catatan = item.catatan.trim();

            var bahanAjarBaru = {
                kode: item.kode,
                judul: item.judul.trim(),
                kategori: item.kategori,
                upbjj: item.upbjj,
                lokasiRak: item.lokasiRak.trim().toUpperCase(),
                harga: item.harga,
                qty: item.qty,
                safety: item.safety,
                // Catatan dari pengguna di-escape karena kolom catatan dirender dengan v-html;
                // tanpa ini teks seperti <script> akan diperlakukan sebagai HTML.
                catatanHTML: catatan === "" ? "-" : this.escapeHtml(catatan)
            };
            // --- langkah 1 - selesai - susun data bahan ajar baru dari form

            // --- langkah 2 - mulai - simpan ke daftar stok lalu bersihkan form
            this.stok.push(bahanAjarBaru);
            this.resetForm();
            this.showFeedback("form", "success", "Bahan ajar " + bahanAjarBaru.kode + " berhasil ditambahkan ke tabel stok.");
            // --- langkah 2 - selesai - simpan ke daftar stok lalu bersihkan form
        },

        resetForm: function () {
            this.newItem = createEmptyBahanAjar();
            this.submitAttempted = false;
            this.kodeInfo = "";
        },

        showFeedback: function (area, type, message) {
            this.feedback.area = area;
            this.feedback.type = type;
            this.feedback.message = message;
        },

        escapeHtml: function (text) {
            return text
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#39;");
        }
    }
});
