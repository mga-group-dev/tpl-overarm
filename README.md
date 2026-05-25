var HEADERS = [
  "Timestamp",
  "Registration Type",
  "Full Name",
  "Age",
  "Gender",
  "Contact Number",
  "Company Name",

  "Eligibility Category",
  "GST Number",
  "Salary Company Name",
  "Designation",
  "DPIIT Certificate",
  "Trademark Certificate",

  "Playing Expertise",
  "Batting Skills",
  "Bowling Skills",
  "Fielding Skills",

  "Jersey Size",
  "Jersey Number",
  "Jersey Name",

  "Photo URL",
  "Crichero Profile",

  "Team Name",

  "Payment Status",
  "Registration Amount",
  "Payment ID",
  "Order ID"
];

function setupSheet() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

  sheet.setName("Registrations");

  sheet.clear();

  sheet
    .getRange(1, 1, 1, HEADERS.length)
    .setValues([HEADERS]);

  var headerRange = sheet.getRange(
    1,
    1,
    1,
    HEADERS.length
  );

  headerRange.setFontWeight("bold");
  headerRange.setBackground("#1a73e8");
  headerRange.setFontColor("#ffffff");

  sheet.setFrozenRows(1);

  sheet.autoResizeColumns(1, HEADERS.length);
}

function ensureHeaders(sheet) {
  var firstRow = sheet
    .getRange(1, 1, 1, HEADERS.length)
    .getValues()[0];

  var hasHeaders = firstRow[0] === HEADERS[0];

  if (!hasHeaders) {
    sheet.insertRowBefore(1);

    sheet
      .getRange(1, 1, 1, HEADERS.length)
      .setValues([HEADERS]);

    var headerRange = sheet.getRange(
      1,
      1,
      1,
      HEADERS.length
    );

    headerRange.setFontWeight("bold");
    headerRange.setBackground("#1a73e8");
    headerRange.setFontColor("#ffffff");

    sheet.setFrozenRows(1);

    sheet.autoResizeColumns(1, HEADERS.length);
  }
}

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    var sheet = ss.getSheetByName("Registrations");

    if (!sheet) {
      sheet = ss.insertSheet("Registrations");
    }

    ensureHeaders(sheet);

    var data = JSON.parse(e.postData.contents);

    var row = data.row;

    // =================================
    // VALIDATE ROW LENGTH
    // =================================

    if (
      !Array.isArray(row) ||
      row.length !== HEADERS.length
    ) {
      return ContentService
        .createTextOutput(
          JSON.stringify({
            success: false,
            error:
              "Row length mismatch. Expected " +
              HEADERS.length +
              " columns, got " +
              (row ? row.length : 0)
          })
        )
        .setMimeType(ContentService.MimeType.JSON);
    }

    // =================================
    // DEDUPLICATE PAYMENT ID
    // =================================

    // Payment ID column is now 26
    // Array index = 25

    var paymentId = row[25];

    if (paymentId) {
      var lastRow = sheet.getLastRow();

      if (lastRow > 1) {

        // Column 26 = Payment ID
        var existingIds = sheet
          .getRange(2, 26, lastRow - 1, 1)
          .getValues();

        for (var i = 0; i < existingIds.length; i++) {
          if (existingIds[i][0] === paymentId) {
            return ContentService
              .createTextOutput(
                JSON.stringify({
                  success: true
                })
              )
              .setMimeType(
                ContentService.MimeType.JSON
              );
          }
        }
      }
    }

    // =================================
    // APPEND ROW
    // =================================

    sheet.appendRow(row);

    return ContentService
      .createTextOutput(
        JSON.stringify({
          success: true
        })
      )
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {

    return ContentService
      .createTextOutput(
        JSON.stringify({
          success: false,
          error: err.message
        })
      )
      .setMimeType(ContentService.MimeType.JSON);
  }
}