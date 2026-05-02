# Panduan Integrasi Google Sheets J&T Lalan (PENTING!)

Jika data tidak masuk, biasanya karena masalah **Izin (Permissions)**. Ikuti langkah ini dengan sangat teliti:

## 1. Persiapan Google Sheet
- Buka Google Sheet baru.
- Beri nama Sheet tersebut (misal: "Database J&T").

## 2. Pasang Kode Apps Script
- Klik menu **Extensions** > **Apps Script**.
- **Hapus semua kode** yang ada di sana (kosongkan total).
- Tempel kode di bawah ini:

```javascript
// Fungsi untuk MEMBACA data (Pencarian Otomatis)
function doGet(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var rows = sheet.getDataRange().getValues();
    var data = [];
    
    for (var i = 1; i < rows.length; i++) {
      data.push({
        timestamp: rows[i][0],
        name: rows[i][1],
        phone: rows[i][2],
        address: rows[i][3],
        resi: rows[i][4],
        status: rows[i][5]
      });
    }
    
    return ContentService.createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({error: err.message}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var contents = e.postData.contents;
    var data = JSON.parse(contents);
    
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["Tanggal", "Nama Pelanggan", "WhatsApp", "Alamat", "Nomor Resi", "Status"]);
      sheet.getRange(1, 1, 1, 6).setFontWeight("bold").setBackground("#E31E24").setFontColor("white");
    }
    
    var dataArray = Array.isArray(data) ? data : [data];
    var allRows = sheet.getDataRange().getValues();
    
    dataArray.forEach(function(item) {
      var phoneToFind = "'" + (item.phone || "");
      var foundRowIndex = -1;
      
      for (var i = 1; i < allRows.length; i++) {
        if (allRows[i][2] == phoneToFind || allRows[i][2] == item.phone) {
          foundRowIndex = i + 1;
          break;
        }
      }
      
      var rowData = [
        item.timestamp || new Date().toLocaleString("id-ID"),
        item.name || "-",
        "'" + (item.phone || ""),
        item.address || "-",
        item.resi || "-",
        item.status || "pending"
      ];
      
      if (foundRowIndex > -1) {
        sheet.getRange(foundRowIndex, 1, 1, 6).setValues([rowData]);
      } else {
        sheet.appendRow(rowData);
      }
    });
    
    return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);
  } catch (err) {
    return ContentService.createTextOutput("Error: " + err.message).setMimeType(ContentService.MimeType.TEXT);
  }
}
```

## 3. Cara Deploy (WAJIB BENAR)
1. Klik tombol biru **Deploy** di kanan atas.
2. Pilih **New Deployment**.
3. Klik ikon Gear (Pilih type) > Pilih **Web App**.
4. **Konfigurasi WAJIB:**
   - **Description:** (bebas)
   - **Execute as:** Me (Email Anda)
   - **Who has access:** **Anyone** (Ini paling penting, jangan pilih 'Only myself'!)
5. Klik **Deploy**.
6. Klik **Authorize Access**. Pilih akun Google Anda.
7. Muncul "Google hasn't verified this app"? Klik **Advanced** > Klik **Go to J&T Sync (unsafe)**.
8. Klik **Allow**.
9. Salin (Copy) **Web App URL** yang muncul.

## 4. Hubungkan ke Aplikasi
- Buka file `src/constants.ts` di editor aplikasi ini.
- Ganti URL yang lama dengan yang baru saja Anda salin.
- Simpan file.

## 5. Tes
- Tambahkan satu kontak baru di aplikasi.
- Klik tombol **Simpan ke Database** (ikon awan/database).
- Cek Google Sheet Anda.

**Catatan:** Jika Anda sudah deploy sebelumnya tapi mengubah kode di Apps Script, Anda harus **Deploy Ulang** (New Deployment) atau ubah versi deployment-nya agar kode terbaru yang berjalan.
