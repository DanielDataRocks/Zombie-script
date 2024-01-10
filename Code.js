// Wersja zmodyfikowana
// orginalna znajduje się tutaj:
// https://github.com/google/low_volume_skus/blob/main/low_volume_skus.js
// Instrukcja:
// https://services.google.com/fh/files/events/_new_implementation_guide_low_volume_skus.pdf
//

// wybierz numer "custom label" [0-4] - powinna być całkowicie wolna, bo powodje nadpisanie wszystkich wartości
// numer powinien być zgodny z plikeiem z Google spreadsheet - kolumna B1 = 'custom_label4'
var CUSTOM_LABEL_NR = '4';

// Poniżej nalezy podać adres do pliku w Google spreadsheet
// Nazwy zakładek muszą być takie jak w pliku:
// https://docs.google.com/spreadsheets/d/1VdzaWRbDF6YtJd-LSnPvObPzoiJsRE_4Hhwx6oJnpy8/edit?usp=sharing
// Podstawowe nazwy arkuszy to: Data, ALL, Produkty RAMPED_UP
// Plik można skopiować i będzie działać :) 
var SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1dQa2TyWgXDFNBFo00abXCVdQdbsvisfL229kZykkEek/edit?usp=sharing';


// Set the value for the label for newly flagged low volume products.
// etykieta dla produktów Zombie - można zmienić sobie nazwę.
var LABEL_LOW = 'low_clicks_last_30d';
// Set the value for the label for low volume products that have ramped up.
// etykieta dla produktów Zombie Reborn - można zmienić sobie nazwę.
var LABEL_RAMPED_UP = 'product_ramped_up';


// ilość kliknięć od której produkty są Zoombie lub Zombie reborn
var THRESHOLD = '30';

// LIMIT KONWERSJI, od którego produkt staje się bestsellerem
var BESTSELLER_FLOOR = "50"
// WAŻNE:
// fitr uznający produkty za Zoombie
var FILTER_BESTSELLERS = `metrics.conversions < ${BESTSELLER_FLOOR}` ;

// Tego nie zmieniamy
var FILTER_RAMPED_UP = 'segments.product_custom_attribute' + CUSTOM_LABEL_NR + ' = "' + LABEL_LOW + '" ';

// Jesli jest true to uruchomione jest filtrowanie danych na podstawie jednej kampanii
// nazwę kampanii należy podać w "Twoja nazwa kampanii"
var USE_CAMPAIGN_FILTER = true;
var FILTER_CAMPAIGN_NAME = ' AND campaign.name LIKE "PLA Smart" ';

// Enter time duration below. Possibilities:
// TODAY | YESTERDAY | LAST_7_DAYS | LAST_WEEK | LAST_BUSINESS_WEEK |
// THIS_MONTH | LAST_MONTH | LAST_14_DAYS | LAST_30_DAYS |
// THIS_WEEK_SUN_TODAY | THIS_WEEK_MON_TODAY | LAST_WEEK_SUN_SAT Currently
// default time duration is set to: LAST_30_DAYS
var TIME_DURATION = 'LAST_30_DAYS';

// Ilość przetwarzanych produktów
var COUNT_LIMIT = '100000';


function main() {
  // Raportowanie: Filtr + nazwa pliku
  // do tego są potrzezbne zakłądki Report ALL, Report RAMPED_UP, Report LOW
  //getReport('metrics.clicks < 40', 'Report ALL');
  //getReport('segments.product_custom_attribute' + CUSTOM_LABEL_NR + ' = "' + LABEL_RAMPED_UP + '" ', 'Report RAMPED_UP');
  //getReport('segments.product_custom_attribute' + CUSTOM_LABEL_NR + ' = "' + LABEL_LOW + '" ', 'Report LOW');

  
  Logger.log('Wszystkich oznaczonych produktów LABEL_LOW z warunku FILTER_ALL');
	var productsAll       = getFilteredShoppingProducts(FILTER_BESTSELLERS, 'ALL');
  Logger.log('Wszystkich oznaczonych produktów LABEL_RAMPED_UP z warunku FILTER_RAMPED_UP');
	var productsRampedUp  = getFilteredShoppingProducts(FILTER_RAMPED_UP, 'Produkty RAMPED_UP');
	var products = productsAll.concat(productsRampedUp);
	pushToSpreadsheet(products);
}

function getFilteredShoppingProducts(filters, ReportName) {
	var campaignField = ''
	if (USE_CAMPAIGN_FILTER) {
		campaignField = 'campaign.name, ';
		filters = filters + FILTER_CAMPAIGN_NAME
	}
	var query = 'SELECT segments.product_item_id, ' +
		campaignField +
		'segments.product_custom_attribute' + CUSTOM_LABEL_NR + ', ' +
		'metrics.clicks, metrics.impressions, metrics.conversions ' +
		'FROM shopping_performance_view WHERE ' + filters +
		' AND segments.product_item_id != "undefined"' +
		' AND segments.date DURING ' + TIME_DURATION +
		' ORDER BY metrics.conversions DESC LIMIT ' + COUNT_LIMIT;
	var products = [];
	var count = 0;
  var count_new = 0;

  // Podgląd query w razie problemów z filtrami
  //Logger.log(query);
  
	var report = AdsApp.report(query);
  
  // Raportowanie
  report.exportToSheet(SpreadsheetApp.openByUrl(SPREADSHEET_URL).getSheetByName(ReportName));

  
	var rows = report.rows();
	while (rows.hasNext()) {
		var row = rows.next();
		var clicks = row['metrics.clicks'];
    var impressions = row['metrics.impressions'];
		var conversions = row['metrics.conversions'];
		var productId = row['segments.product_item_id']
    var label = row['segments.product_custom_attribute4']

		// Label product as LABEL_LOW
		if (label != LABEL_LOW && clicks < THRESHOLD) {
			products.push([productId.toUpperCase(), LABEL_LOW]);
			count += 1;
		} 
    // Label product as ramped up
    // WAŻNE
    // Warunek Zombie reborn
    if (label == LABEL_LOW && ( clicks > THRESHOLD || conversions > 0 ) ) {
			products.push([productId.toUpperCase(), LABEL_RAMPED_UP]);
			count += 1;
		}
	}
	Logger.log(count);
	return products;
}

// Funkcja do raportowania
function getReport(filters, ReportName) {
	var campaignField = ''
	if (USE_CAMPAIGN_FILTER) {
		campaignField = 'campaign.name, ';
		filters = filters + FILTER_CAMPAIGN_NAME
	}
	var query = 'SELECT segments.product_item_id, ' +
		campaignField +
		'segments.product_custom_attribute' + CUSTOM_LABEL_NR + ', ' +
		'metrics.clicks, metrics.impressions, metrics.conversions ' +
		'FROM shopping_performance_view WHERE ' + filters +
		' AND segments.product_item_id != "undefined"' +
		' AND segments.date DURING ' + TIME_DURATION +
		' ORDER BY metrics.conversions DESC LIMIT ' + COUNT_LIMIT;
	var products = [];
	var count = 0;
  var count_new = 0;

  // Podgląd query w razie problemów z filtrami
  //Logger.log(query);
	var report = AdsApp.report(query);
  report.exportToSheet(SpreadsheetApp.openByUrl(SPREADSHEET_URL).getSheetByName(ReportName));
}

// Funkcja eksportująca nowe dane
function pushToSpreadsheet(data) {
	var spreadsheet = SpreadsheetApp.openByUrl(SPREADSHEET_URL);
	var sheet = spreadsheet.getSheetByName('Data');
	var lastRow = sheet.getMaxRows();
	sheet.getRange('A2:B' + lastRow).clearContent();
	var start_row = 2;
	var endRow = start_row + data.length - 1;
	var range = sheet.getRange(
		'A' + start_row + ':' +
		'B' + endRow);
	if (data.length > 0) {
		range.setValues(data);
	}
	return;
}
