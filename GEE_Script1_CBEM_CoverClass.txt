//***Supplementary Materials***

//**Script 1: Inspect imagery, classify cover, and evaluate accuracy**


// The purpose of this script is to create a cloud-free
// Sentinel-2 satellite composite image for the study area.
// It averages spectral data over the time interval of interest:
    // 15 August to 1 October 2018.
// It then builds a model using spectral bands B4 and B11 combined with two
    // indices of vegetation vigor (NDVI and NDRE) from the input image.
// The user draws and labels polygons to indicate 4 cover classes: impervious
    // surfaces, water, brown vegetation, green vegetation.
// The labeled polygons are input into a Random Forest classifier with 100 trees.
// The classifier is then applied to classify each of the late-season
    // (15 August to 1 October) composite images: 2016, 2017, 2018, 2019
// The user draws and labels validation polygons with the 4 cover classes on
    // one of the classified images (other than the input image). These are
    // input for the confusion matrix, used to evaluate accuracy
// Finally, it exports classified late season composite images to Assets or
    // Google Drive for subsequent analysis.

//***NOTE: Some lines are commented out with "//" so that they will not use
    // computing power unless needed in the current run. The user can then
    // choose which lines to activate for each run for efficiency in producing
    // desired outputs.

// Imported assets that accompany this script will include training polygons,
    // classified image composites (after classification step has run),
    // and polygons for validation.


//***Set the boundaries of the area for image querying and analysis***
    // If changing to another study area with option (2) or (3) above, delete or
    // comment out the following two lines of code (lines 78-85).
    var studyAreaGeometry = ee.Geometry.Polygon([
      [[-119.1098, 47.7328],
      [-115.5251, 47.7328],
      [-115.5251, 45.3685],
      [-119.1098, 45.3685]]
      ]);

    var ROI = ee.FeatureCollection(studyAreaGeometry);


// Function to mask clouds using the Sentinel-2 QA band.
function maskS2clouds(image) {
  var qa = image.select('QA60');
  // Bits 10 and 11 are clouds and cirrus, respectively.
  var cloudBitMask = 1 << 10;
  var cirrusBitMask = 1 << 11;
  // Both flags should be set to zero, indicating clear conditions.
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0).and(
             qa.bitwiseAnd(cirrusBitMask).eq(0));
  // Return the masked and scaled data, without the QA bands.
  return image.updateMask(mask).divide(10000)
      .select("B.*")
      .copyProperties(image, ["system:time_start"]);
}	//be sure to include the closing bracket to this function


//***Query Sentinel-2 image collection***

// * Training image *
// Create a variable to store the training image collection overlapping the
    // study area (ROI), filtered to the time period of interest
    var trainingCollection = ee.ImageCollection('COPERNICUS/S2')
        .filter(ee.Filter.bounds(ROI))
        .filterDate('2018-08-15', '2018-10-01')

// Pre-filter to get fewer cloudy granules (here, < 20% cloud cover —
    // you can change to other thresholds if needed, e.g. 50 or 60 for a
    // frequently cloudy area)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))

// Apply the cloud mask
    .map(maskS2clouds);   // (the line of code ends here with semicolon)


// Average the images by taking the median value of each pixel to create a
    // single composite image.
    var trainingMedian = trainingCollection.median();

// Clip the composite image to the study area outline (ROI)
    var trainingImage = trainingMedian.clipToCollection(ROI);


// * Image to be classified *
// Create a variable to store the training image collection overlapping the
    // study area (ROI), filtered to the time period of interest (change dates
    // in lines below as needed)
  var classifyCollection = ee.ImageCollection('COPERNICUS/S2')
      .filter(ee.Filter.bounds(ROI))
      .filterDate('2019-08-15', '2019-10-01')  //change dates in parentheses
                                                // as desired

// Pre-filter to get less cloudy granules. Use the same cloud threshold as
    // for training image above (here it’s set to 20).
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
    .map(maskS2clouds);

// Average the images by taking the median value of each pixel to create a
    // single composite image.
    var classifyMedian = classifyCollection.median();

// Clip the composite image to the study area outline (ROI)
    var classifyImage = classifyMedian.clipToCollection(ROI);


//To view information about available imagery (replace “classifyCollection”
    // below with “trainingCollection” or another image collection variable
    // to get information about it.
print('Collection: ', classifyCollection);	//comment this line out after
      //you have the information so it does not use memory in subsequent runs.

//Get the number of images. Replace “classifyCollection” with another image
    // collection variable to get information about it.
var count = classifyCollection.size();
print('Count: ', count);		//comment this line out after you have the
                // information so it does not use memory in subsequent runs.


//***Compute NDVI and NDRE and add as bands to median composite images.***
//*Use the normalizedDifference(A, B) to compute (A - B) / (A + B) for each
    // index. We create a function to do this so it can be repeated as needed
    // for subsequent images.

    var addNDRE = function(image) {
      var ndre = image.normalizedDifference(['B8', 'B5']).rename('NDRE');
      return image.addBands(ndre);
    };

    var addNDVI = function(image) {
      var ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI');
      return image.addBands(ndvi);
    };


    //*Add NDVI and NDRE bands to image composites that will be used for
        // training and classification.
    var ndre_train = addNDRE(trainingImage).select('NDRE');
    var ndvi_train = addNDVI(trainingImage).select('NDVI');
    var ndre_classify = addNDRE(classifyImage).select('NDRE');
    var ndvi_classify = addNDVI(classifyImage).select('NDVI');
    var indexParam = {min: -1, max: 1, palette: ['black', 'white']};


//***Set the map center location and zoom level, then add map layers.***
// Notes: You can use the Inspector to find coordinates and zoom level on the
    // map. In the lines below, “false” indicates that the map layer will not
    // be displayed by default (in Layers, the box will be unchecked), which
    // saves loading time. Image visualization parameters can be manually
    // adjusted and imported as a variable for subsequent script runs. To do
    // this, hover over the layer on the map and click the settings symbol.

// Here, we add true color and color infrared layers for the training image,
    // as well as the vegetation indices for both training and classification
    // images. One could similarly display the true color and color infrared
    // layers for other images by substituting “trainingImage” in a Map.addLayer
    // line with the variable storing the desired image.
    Map.setCenter(-117.3052, 46.5685, 8);
    Map.addLayer(trainingImage, {bands: ['B4', 'B3', 'B2'], max: 0.5, gamma: 2},
        'Sentinel true color Late 2018 training image', false);
    Map.addLayer(trainingImage, {bands: ['B8', 'B4', 'B3'], max: 0.5, gamma: 2},
        'Sentinel color infrared Late 2018 training image', false);
    Map.addLayer(ndvi_train, indexParam,
        'NDVI in image sampled for training', false);
    Map.addLayer(ndre_train, indexParam,
        'NDRE in image sampled for training', false);
    Map.addLayer(ndvi_classify, indexParam,
        'NDVI in image to classify', false);
    Map.addLayer(ndre_classify, indexParam,
        'NDRE in image to classify', false);


//***Create multiband rasters to create customized image composites for training
    // and classification. Here we selected two bands and two vegetation indices
    // to use for classification. The remote sensing literature can provide
    // guidance on the best inputs to use for a given study.

//*Assign variables for each spectral band of interest and concatenate with
    // spectral indices into a single multiband image for training and
    // classification, respectively.
    var B4_train = trainingImage.select('B4');
    var B11_train = trainingImage.select('B11');
    var bandsTraining = ee.Image.cat(
          [B4_train, B11_train, ndvi_train, ndre_train]);
    print('bands in training image: ', bandsTraining);
              //comment out "print" line above after checking image bands

    var B4_classify = classifyImage.select('B4');
    var B11_classify = classifyImage.select('B11');
    var bandsClassify = ee.Image.cat(
          [B4_classify, B11_classify, ndvi_classify, ndre_classify]);
    print('bands in image to be classified: ', bandsClassify);
            //comment out "print" line above after checking image bands


//***Image classification (into 4 land cover classes: open water, impervious
    // surfaces, green vegetation, brown vegetation or bare soil)

// Use these bands for prediction. (These bands should have matching names and
    // order to the concatenated images created above.)
    var bands = ['B4', 'B11', 'NDVI', 'NDRE'];

// *Make a FeatureCollection from the hand-made geometries and assign it to a
    // variable (“polygons”). (Here, we assigned a value of 0 to both “Other”
    // (impervious surfaces) and “OpenWater” because they were not the focus of
    // our analysis. One could designate a separate class for open water by
    // coding it differently than “Other”)

// *Note: to run the remaining lines in this script, one would
    // either draw polygons in the map viewer and label them by cover class
    // (GreenVeg, BrownVeg, etc.) or ingest and import the shapefile of training
    // polygons from github, then assign it to the variable "polygons" and
    // delete the line of code below.
    // If using hand-drawn polygons, remove comment marks to run the line below.
        //var polygons = ee.FeatureCollection([
        //  ee.Feature(Other, {'class': 0}),
        //  ee.Feature(OpenWater, {'class': 0}),
        //  ee.Feature(BrownVeg, {'class': 1}),
        //  ee.Feature(GreenVeg, {'class': 2}),
        //  ]);

// *Get the values for all pixels in each polygon in the training.
var training = bandsTraining.sampleRegions({
  // Get the sample from the polygons FeatureCollection.
  collection: polygons,
  // Keep this list of properties from the polygons.
  properties: ['class'],
  // Set the scale to get Sentinel pixels in the polygons. (Adjust the scale according to the spatial resolution of input imagery.)
  scale: 10
});

// *Create a random forest classifier with 10 trees.
var classifier = ee.Classifier.smileRandomForest(100);

// *Train the classifier.
var trained = classifier.train(training, 'class', bands);


// *Classify the composite images. To use only minimum memory needed per run of
    // the script, we recommend completing only one image classification per
    // script run. One can then export the classified image to Assets (using
    // Export line below) and subsequently import it into this or another script
    // as needed. The completed classification line should then be commented
    // out, deleted, or updated with a new image to classify.

  // uncomment the line of code that follows to classify the composite image
      // “bandsTraining” that was sampled for training (assuming that only
      // selected portions of this image, e.g., the areas within hand-drawn
      // polygons, were sampled for training)
    // var trainingClassified = bandsTraining.classify(trained);
          // remove "//" before "var" in line above to classify the training image


  // uncomment the line below to classify the composite image “bandsClassify”,
      // note that you will see an error message saying "imageClassified is not
      // defined in this scope as long as the line below is commented out.
      // The classifier cannot be used until a set of training polygons has
      // been either imported or hand-drawn in the Code Editor.
  //var imageClassified = bandsClassify.classify(trained);

// Display classification results.
	// Set visualization parameters for the classified images.
  var ClassParam = {min: 0, max: 2, palette: ["373e8d","ffc772","20b82c"],
                    opacity: 0.6};


// Remove comment marks from lines below as needed to display classification
    // results for current script run.
//Map.addLayer(trainingClassified, ClassParam, 'training image classified', false);
//Map.addLayer(imageClassified, ClassParam, 'Late 2019 image classified', false);


//***Export classified image***
// Set image: current image to export, update description)--> choose option to
    // save as an Earth Engine Asset or TIFF in Google Drive. To follow
    // subsequent steps in this script, save classified images to your Assets.

       Export.image.toDrive({
               image: imageClassified,	//if this throws an error, check  that
                          // the line creating imageClassified is uncommented
               description: 'Late19classified_100trees', //enter name
               scale: 10,		//adjust as appropriate
               maxPixels: 1e9,	// adjust if needed
               region: ROI
               });

// After each classified image has been exported to Assets, it can be imported
    // and displayed for subsequent analysis (remove // before "Map" for each
    // corresponding classified image after import). In the accompanying article,
    // we classified four images and exported each to Assets, then imported into
    // this script. We assigned each image to a variable, such that “class16” is
    //the classified image composite from late summer 2016, and so on.
//Map.addLayer(class16, ClassParam, '2016 classification--imported Asset');
//Map.addLayer(class17, ClassParam, '2017 classification--imported Asset');
//Map.addLayer(class18, ClassParam, '2018 classification--imported Asset');
//Map.addLayer(class19, ClassParam, '2019 classification--imported Asset');
//Map.addLayer(polygons, {}, 'training polygons');  //uncomment this line to
    //show the training polygon outlines in the map display when the script is run.



//***Evaluating Accuracy***
// FeatureCollection to evaluate classification accuracy. First, create
    // hand-drawn polygons using Google Earth, Sentinel, or other
    // higher-resolution imagery if available. (For this approach, the total
    // number of validation pixels must be less than 5000.) Here the polygons
    // were labeled EvalNonVeg, EvalBrownVeg, or EvalGreenVeg and assigned values
    // corresponding to the classification above. (A shapefile containing
    // example validation polygons from the 2019 classified image is available
    // on GitHub).
    // If using hand-drawn polygons, remove comment marks to run the line below.

    // var polyEval = ee.FeatureCollection([
      // ee.Feature(EvalNonVeg, {'vclass': 0}),
      // ee.Feature(EvalBrownVeg, {'vclass': 1}),
      // ee.Feature(EvalGreenVeg, {'vclass': 2}),
    //]);


// Sample specified classification results (class 16, class17, class18 or
    // class19 to validation areas (not to exceed 5000 pixels).
    var validation = class19.sampleRegions({
      collection: polyEval,
      properties: ['vclass'],
      scale: 10,
    });


//Compare the cover class of validation data against the classification result.
  var testAccuracy = validation.errorMatrix('vclass', 'classification');

  //Print the error matrix to the console (uncomment line below to run)
    //print('Validation error matrix: ', testAccuracy);

  //Print the overall accuracy to the console (uncomment line below to run)
    //print('Validation overall accuracy: ', testAccuracy.accuracy());


//***Additional information***
// Additional information can be extracted from the objects created in the
    // Code Editor. For example, to calculate the area of the training polygons
    // in square meters:
    // First, create an "image" of pixels with area in m^2
     var img = ee.Image.pixelArea().clip(polygons);

    // then use reducer to compute sum of areas in polygons.
     var area2 = img.reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: polygons,
      scale: 10,	// adjust as appropriate
      maxPixels: 1E13	//adjust if needed
     });

     // Display the results. (Remove comment marks before in the line of code
        // below to display the area value.
    //print('area of training polygons: ', ee.Number(area2.get('area'))
    //      .getInfo() + ' m2');
