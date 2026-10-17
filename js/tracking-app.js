// ===== TRACKING DELIVERY ORDER: LOGIKA VUE UNTUK tracking.html =====
// Data awal mengikuti template dataBahanAjar.js dari soal. DO baru hanya tersimpan di memori
// halaman, sehingga memuat ulang halaman mengembalikan data contoh awal.

var POLA_NIM = /^\d{9}$/;
var POLA_NAMA = /^[A-Za-z][A-Za-z .']*$/;

// Progres pengiriman per status. "Diproses" dipakai untuk DO yang baru dibuat dari form.
var PROGRES_STATUS = {
    "Diproses": 20,
    "Dalam Perjalanan": 60,
    "Dikirim": 100
};

function padAngka(angka, panjang) {
    var teks = String(angka);

    while (teks.length < panjang) {
        teks = "0" + teks;
    }

    return teks;
}

// Tanggal dan waktu disusun dari komponen lokal, bukan toISOString(), karena toISOString()
// memakai UTC sehingga tanggal bisa mundur sehari ketika dibuka sebelum pukul 07.00 WIB.
function tanggalLokal(date) {
    return date.getFullYear() + "-" + padAngka(date.getMonth() + 1, 2) + "-" + padAngka(date.getDate(), 2);
}

function waktuLokal(date) {
    return tanggalLokal(date) + " "
        + padAngka(date.getHours(), 2) + ":"
        + padAngka(date.getMinutes(), 2) + ":"
        + padAngka(date.getSeconds(), 2);
}

function createEmptyDO() {
    return {
        nim: "",
        nama: "",
        ekspedisi: "",
        paketKode: "",
        tanggalKirim: tanggalLokal(new Date()),
        total: 0
    };
}

var trackingApp = new Vue({
    el: "#app",
    
    data: {
        pengirimanList: [
            { kode: "REG", nama: "Reguler (3-5 hari)" },
            { kode: "EXP", nama: "Ekspres (1-2 hari)" }
        ],
        paket: [
            { kode: "PAKET-UT-001", nama: "PAKET IPS Dasar", isi: ["EKMA4116", "EKMA4115"], harga: 120000 },
            { kode: "PAKET-UT-002", nama: "PAKET IPA Dasar", isi: ["BIOL4201", "FISIP4001"], harga: 140000 }
        ],

        // Hanya kode dan judul dari data stok yang dibutuhkan untuk menampilkan isi paket.
        stok: [
            { kode: "EKMA4116", judul: "Pengantar Manajemen" },
            { kode: "EKMA4115", judul: "Pengantar Akuntansi" },
            { kode: "BIOL4201", judul: "Biologi Umum (Praktikum)" },
            { kode: "FISIP4001", judul: "Dasar-Dasar Sosiologi" }
        ],
        tracking: {
            "DO2025-0001": {
                nim: "123456789",
                nama: "Rina Wulandari",
                status: "Dalam Perjalanan",
                ekspedisi: "JNE",
                tanggalKirim: "2025-08-25",
                paket: "PAKET-UT-001",
                total: 120000,
                perjalanan: [
                    { waktu: "2025-08-25 10:12:20", keterangan: "Penerimaan di Loket: TANGSEL" },
                    { waktu: "2025-08-25 14:07:56", keterangan: "Tiba di Hub: JAKSEL" },
                    { waktu: "2025-08-26 08:44:01", keterangan: "Diteruskan ke Kantor Tujuan" }
                ]
            }
        },

        // State pencarian DO.
        searchNumber: "",
        activeNumber: "",
        searchError: "",

        // State form DO baru.
        form: createEmptyDO(),
        submitAttempted: false,
        successMessage: ""
    },

    computed: {
        doList: function () {
            var tracking = this.tracking;

            return Object.keys(tracking).sort().map(function (nomor) {
                return {
                    nomor: nomor,
                    nama: tracking[nomor].nama,
                    status: tracking[nomor].status
                };
            });
        },

        // Nomor DO = "DO" + tahun berjalan + urutan 3 digit. Urutan dihitung dari DO tahun yang
        // sama saja, sehingga data contoh DO2025-0001 tidak memengaruhi nomor tahun berjalan.
        nextNomorDO: function () {
            var prefix = "DO" + new Date().getFullYear() + "-";

            var urutanTerakhir = Object.keys(this.tracking)
                .filter(function (nomor) {
                    return nomor.indexOf(prefix) === 0;
                })
                .map(function (nomor) {
                    return parseInt(nomor.slice(prefix.length), 10) || 0;
                })
                .reduce(function (terbesar, urutan) {
                    return Math.max(terbesar, urutan);
                }, 0);

            return prefix + padAngka(urutanTerakhir + 1, 3);
        },

        selectedPaket: function () {
            var kode = this.form.paketKode;

            return this.paket.find(function (item) {
                return item.kode === kode;
            }) || null;
        },

        activeOrder: function () {
            return this.tracking[this.activeNumber] || null;
        },

        progress: function () {
            if (!this.activeOrder) {
                return 0;
            }

            return PROGRES_STATUS[this.activeOrder.status] || 0;
        },

        progressLabel: function () {
            if (this.progress === 100) {
                return "Paket sudah selesai dikirim";
            }

            if (this.progress >= 60) {
                return "Paket sedang dalam perjalanan";
            }

            return "Paket sedang disiapkan untuk dikirim";
        },

        // slice() agar urutan riwayat asli tidak berubah ketika diurutkan untuk tampilan.
        sortedEvents: function () {
            if (!this.activeOrder) {
                return [];
            }

            return this.activeOrder.perjalanan.slice().sort(function (first, second) {
                return first.waktu.localeCompare(second.waktu);
            });
        },

        formErrors: function () {
            var form = this.form;
            var errors = {};

            if (!POLA_NIM.test(form.nim)) {
                errors.nim = "NIM wajib 9 digit angka.";
            }

            if (form.nama.trim().length < 3) {
                errors.nama = "Nama minimal 3 huruf.";
            } else if (!POLA_NAMA.test(form.nama.trim())) {
                errors.nama = "Nama hanya boleh berisi huruf, spasi, titik, atau apostrof.";
            }

            if (form.ekspedisi === "") {
                errors.ekspedisi = "Pilih jenis ekspedisi.";
            }

            if (form.paketKode === "") {
                errors.paketKode = "Pilih paket bahan ajar.";
            }

            if (!/^\d{4}-\d{2}-\d{2}$/.test(form.tanggalKirim)) {
                errors.tanggalKirim = "Tanggal kirim wajib diisi.";
            }

            return errors;
        },

        isFormValid: function () {
            return Object.keys(this.formErrors).length === 0;
        }
    },

    watch: {
        // Watcher 1: total harga selalu mengikuti harga paket yang dipilih.
        "form.paketKode": function () {
            this.form.total = this.selectedPaket ? this.selectedPaket.harga : 0;
        },

        // Watcher 2: pesan "tidak ditemukan" dihapus begitu pengguna mengetik ulang nomor DO,
        // seperti contoh watcher pada materi yang merespons perubahan input.
        searchNumber: function () {
            this.searchError = "";
        },

        // Watcher 3: pesan sukses DO sebelumnya disembunyikan ketika pengguna mulai mengisi DO baru.
        "form.nim": function (nimBaru) {
            if (nimBaru !== "") {
                this.successMessage = "";
            }
        }
    },

    methods: {
        cariDO: function () {
            // --- langkah 1 - mulai - rapikan nomor DO yang diketik
            var nomor = this.searchNumber.trim().toUpperCase();
            // --- langkah 1 - selesai - rapikan nomor DO yang diketik

            // --- langkah 2 - mulai - tampilkan hasil atau pesan kesalahan
            if (nomor === "") {
                this.activeNumber = "";
                this.searchError = "Masukkan nomor DO terlebih dahulu.";
                return;
            }

            if (!this.tracking[nomor]) {
                this.activeNumber = "";
                this.searchError = "Nomor DO " + nomor + " tidak ditemukan. Periksa kembali nomor yang dimasukkan.";
                return;
            }

            this.activeNumber = nomor;
            // --- langkah 2 - selesai - tampilkan hasil atau pesan kesalahan
        },

        lihatDO: function (nomor) {
            this.searchNumber = nomor;
            this.activeNumber = nomor;

            // Kartu hasil berada di atas form dan daftar DO, jadi halaman digulir ke sana setelah
            // Vue selesai merender kartu tersebut.
            this.$nextTick(function () {
                if (this.$refs.hasil) {
                    this.$refs.hasil.scrollIntoView({ behavior: "smooth", block: "start" });
                }
            });
        },

        submitDO: function () {
            this.submitAttempted = true;
            this.successMessage = "";

            if (!this.isFormValid) {
                return;
            }

            // --- langkah 1 - mulai - susun data DO baru dari form
            var nomor = this.nextNomorDO;
            var form = this.form;

            var ekspedisi = this.pengirimanList.find(function (item) {
                return item.kode === form.ekspedisi;
            });

            var doBaru = {
                nim: form.nim,
                nama: form.nama.trim(),
                status: "Diproses",
                ekspedisi: "JNE " + ekspedisi.nama,
                tanggalKirim: form.tanggalKirim,
                paket: form.paketKode,
                total: form.total,
                perjalanan: [
                    { waktu: waktuLokal(new Date()), keterangan: "Data DO dibuat, menunggu penjemputan oleh ekspedisi" }
                ]
            };
            // --- langkah 1 - selesai - susun data DO baru dari form

            // --- langkah 2 - mulai - simpan DO lalu tampilkan hasilnya
            // Vue 2 tidak mendeteksi key baru yang ditambahkan langsung ke object (tracking[nomor] = ...),
            // jadi $set dipakai agar daftar DO dan nomor DO berikutnya ikut diperbarui.
            this.$set(this.tracking, nomor, doBaru);

            this.resetForm();
            this.lihatDO(nomor);
            this.successMessage = "DO " + nomor + " berhasil dibuat. Detail pengirimannya tampil di bagian atas halaman.";
            // --- langkah 2 - selesai - simpan DO lalu tampilkan hasilnya
        },

        resetForm: function () {
            this.form = createEmptyDO();
            this.submitAttempted = false;
        },

        judulBahanAjar: function (kode) {
            var item = this.stok.find(function (bahanAjar) {
                return bahanAjar.kode === kode;
            });

            return item ? item.judul : "Judul belum tercatat";
        },

        namaPaket: function (kode) {
            var item = this.paket.find(function (paket) {
                return paket.kode === kode;
            });

            return item ? item.nama : "-";
        },

        statusClass: function (status) {
            return {
                "is-done": status === "Dikirim",
                "is-new": status === "Diproses"
            };
        },

        formatRupiah: function (value) {
            return "Rp " + Number(value).toLocaleString("id-ID");
        }
    }
});
