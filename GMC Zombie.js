// Barzo ważne! Nad edytorem jest "Zaawansowane interfejsy API" trzeba tam zaznaczyć: Shopping content
// Reszta działa dokładnie tak jak w poprzednim pliku.

var SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1xDhPY5JfNMPhVNPZ0oMJC2JtTRr1pNBCqeI4qyJSL9A/edit?usp=sharing';
var TIME_DURATION = 'LAST_30_DAYS';
var merchantId = 100377291; // Replace this with your Merchant Center ID.
var FILTER_ALL = 'metrics.clicks < 3 AND metrics.impressions < 100 AND metrics.conversions = 0' ;
var USE_CAMPAIGN_FILTER = true;
var FILTER_CAMPAIGN_NAME = ' AND campaign.name LIKE "PMax - PLA - ALL IN" ';
var CUSTOM_LABEL_NR = '4';


function main() {
  var allList = getAllProducts();
  Logger.log('List ready');
  var allZombie = getAllZombie();
  Logger.log('Zombie catched');
  var finalList = makeList(allList, allZombie)
  Logger.log('Done');
  pushToSpreadsheet(finalList)

}

function makeList(aList , zList) {
  var productsListFormated = []
  Logger.log('///////zombieProduct///////');
  Logger.log(zList[0]); 
  Logger.log('///////xProduct///////');
  Logger.log(aList[0]);
  
  for (let i = 0; i < zList.length; i++) {
    var zombieProduct = zList[i]
    for (let j = 0; j < aList.length; j++) {
      var xProduct = aList[j]
      if ( zombieProduct.productId.toLowerCase() == xProduct.offerId.toLowerCase() ){
        
        // Poniżej deklaracja jakie dane ma wypluć
        productsListFormated.push([xProduct.offerId, xProduct.description, xProduct.brand, xProduct.title, xProduct.gtin, xProduct.link, zombieProduct.clicks, zombieProduct.impressions])
        break
      }
    }  
  } 
  return productsListFormated;
}

//wyszukiwacz zobie
function getAllZombie() {
	var campaignField = ''
  var filters = FILTER_ALL;
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
		' ORDER BY metrics.clicks DESC';
	var products = [];
  
  //Logger.log(query);
	var report = AdsApp.report(query);
	var rows = report.rows();
	while (rows.hasNext()) {
		var row = rows.next();
		var clicks = row['metrics.clicks'];
    var impressions = row['metrics.impressions'];
		var conversions = row['metrics.conversions'];
		var productId = row['segments.product_item_id'];
    var label = row['segments.product_custom_attribute4'];
    var product = {
      "productId": productId,
      "clicks": clicks,
      "impressions": impressions,
      "conversions": conversions,
      "label": label
    }
    products.push(product)
	}
	return products;
}


// lista parametrów https://developers.google.com/shopping-content/reference/rest/v2.1/products#Product
// Zbieramy wszystkie produkty z GMC
function getAllProducts() {
  var productsList = [];
  let pageToken;
  let pageNum = 1;
  const maxResults = 250;
  try {
    do {
      const products = ShoppingContent.Products.list(merchantId, {
        pageToken: pageToken,
        maxResults: maxResults
      });
      if (products.resources) {
        for (let i = 0; i < products.resources.length; i++) {
          productsList.push(products.resources[i])
        }
      } else {
        Logger.log('No more products in account ' + merchantId);
      }
      pageToken = products.nextPageToken;
      pageNum++;
      break // DEBUG
    } while (pageToken);
  } catch (e) {
    Logger.log('Failed with error: $s', e.error);
  }
  return productsList
}

// WAZNE
// jeśli doda się więcej parametrów trzeba zmodyfikować również zakres wklejania, jeśli są 4 zmienne to litera D, jeśli 8 to H
// w dwóch miejscach trzeba zmienić literę. 
function pushToSpreadsheet(data) {
  var zakres_wpisz_litere_odpowiadajaca_liczbie_metryk = "H"
  var endRowName = zakres_wpisz_litere_odpowiadajaca_liczbie_metryk
	var spreadsheet = SpreadsheetApp.openByUrl(SPREADSHEET_URL);
	var sheet = spreadsheet.getSheetByName('Data');
	var lastRow = sheet.getMaxRows();
	sheet.getRange('A2:'+ endRowName + lastRow).clearContent();
	var start_row = 2;
	var endRow = start_row + data.length - 1;
	var range = sheet.getRange('A' + start_row + ':' + endRowName + endRow);
	if (data.length > 0) {
		range.setValues(data);
	}
	return;
}
