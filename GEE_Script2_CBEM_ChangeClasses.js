//This is the Classification/Uncertainty script that was used to create
    // Figure 3e,f in Stahl et al. (2021).

// *** The purpose of this script is to generate uncertainty classes by querying
    // 2016-2019 composite images classified by a classifier trained on a 2018
    // image composite.It then computes area-based statistics for the uncertainty
    // classes.

// Before running this script, one must import classified images for each year
    // from Assets, here each is assigned to a variable named "class19",
    // "class18", and so on. We also imported a shapefile of the study area
    // (HUC8_outline_SHP) and a georeferenced TIFF file indicating riparian
    // areas (FP1_Rip_FFA1_Mask1). See example list of imports in image below.


// Set visualization parameters for the classified images.
var ClassParam = {min: 0, max: 2, palette: ["373e8d","ffc772","20b82c"],
                      opacity: 0.6};

// Set map center and display classified images for visual reference.
Map.setCenter(-117.4, 46.5, 8);
Map.addLayer(class19, ClassParam, 'Class 2019');
Map.addLayer(class18, ClassParam, 'Class 2019');
Map.addLayer(class17, ClassParam, 'Class 2019');
Map.addLayer(class16, ClassParam, 'Class 2016');

// ***Create uncertainty classes using an expression, display.
  // first, concatenate classified images into single multiband image.
  var concatYears = ee.Image.cat([class16, class17, class18, class19]);
  print(concatYears);         //comment out unless needed to check output

  // Select and rename bands to user-friendly names.
  var diffYears = concatYears.select(
      ['classification', 'classification_1', 'classification_2', 'classification_3'], // old names
      ['class16', 'class17', 'class18', 'class19']               // new names
  );
  print(diffYears);       //comment out unless needed to check output


// Set color palette for the change classes we will create.
  var palette = ['white', // 0 = not classified
                'black',  // 1 = "non-vegetated" in all 4 years
                'yellow', // 2 = "senesced" in all 4 years
                'green', // 3 = "evergreen" in all 4 years
                'magenta', // 4 = "evergreen" in at least 1 year, "senesced" in at least one year
                'gray', // 5 = "other" in at least 1 year, "senesced" or "other" in other years
                'blue']; // 6 = "other" in at least 1 year, "evergreen" in other years


// Create a series of nested conditional statements to create the desired change classes.
var stabilityExp = diffYears.expression(
   "(b('class16') == 0) && (b('class17') == 0) && (b('class18') == 0) && (b('class19') == 0) ? 1" +
    ": (b('class16') == 1) && (b('class17') == 1) && (b('class18') == 1) && (b('class19') == 1) ? 2" +
      ": (b('class16') == 2) && (b('class17') == 2) && (b('class18') == 2) && (b('class19') == 2) ? 3" +
        ": (b('class16') == 2) && ((b('class17') == 1) || (b('class18') == 1) || (b('class19') == 1)) ? 4" +
          ": (b('class17') == 2) && ((b('class16') == 1) || (b('class18') == 1) || (b('class19') == 1)) ? 4" +
            ": (b('class18') == 2) && ((b('class16') == 1) || (b('class17') == 1) || (b('class19') == 1)) ? 4" +
              ": (b('class19') == 2) && ((b('class16') == 1) || (b('class17') == 1) || (b('class18') == 1)) ? 4" +
                ": (b('class16') == 0) && ((b('class17') < 2) && (b('class18') < 2) && (b('class19') < 2)) ? 5" +
                  ": (b('class17') == 0) && ((b('class16') < 2) && (b('class18') < 2) && (b('class19') < 2)) ? 5" +
                    ": (b('class18') == 0) && ((b('class16') < 2) && (b('class17') < 2) && (b('class19') < 2)) ? 5" +
                      ": (b('class19') == 0) && ((b('class16') < 2) && (b('class17') < 2) && (b('class18') < 2)) ? 5" +
                        ": (b('class16') == 0) && ((b('class17') == 2) || (b('class18') == 2) || (b('class19') == 2)) ? 6" +
                          ": (b('class17') == 0) && ((b('class16') == 2) || (b('class18') == 2) || (b('class19') == 2)) ? 6" +
                            ": (b('class18') == 0) && ((b('class16') == 2) || (b('class17') == 2) || (b('class19') == 2)) ? 6" +
                              ": (b('class19') == 0) && ((b('class16') == 2) || (b('class17') == 2) || (b('class18') == 2)) ? 6" +
     ": 0"
);

// Display the cover change classification as a map layer using the color palette.
Map.addLayer(stabilityExp, {min: 0, max: 6, palette: palette},
      'stability classes 2016-2019');


// *Compute area of each cover change class for the study area.
    // NOTE: the following section of code can be repeated for any subset of
    // the study area. To do so replace "ROI" with the area of interest.

    // Clip the change classification to the study area.
    var class_ROI = stabilityExp.clipToCollection(ROI);

    // Add a band to the classified image so that we can compute areas.
    var addArea = ee.Image.pixelArea().addBands(class_ROI);

    // Use a Reducer to compute the area occupied by each cover change class in
      // the study area.
    var class_areas = addArea.reduceRegion({
        reducer: ee.Reducer.sum().group({
          groupField: 1,
          groupName: 'class_ROI',
        }),
        geometry: ROI,
        scale: 10,
        bestEffort: true,
      });

      // Display the area calculation outputs in the Console.
      print('area per uncertainty class', class_areas);


// Compute area of each transition class for riparian areas only. NOTE: these
    // lines require the user to provide a file to use for a mask (in this case,
    // we used a TIFF in which all riparian area cells had a value of 1.)
    // We imported it and assigned it to the variable "mask".

    // Mask the change classification to show only riparian areas in the study area.
    var class_masked = stabilityExp.updateMask(mask);

    // Add a band to the classified image so that we can compute areas.
    var addArea_rip = ee.Image.pixelArea().addBands(class_masked);

    // Use a Reducer to compute the area occupied by each cover change class in
      // the study area.
    var rip_class_areas = addArea_rip.reduceRegion({
        reducer: ee.Reducer.sum().group({
          groupField: 1,
          groupName: 'class_masked',
        }),
        geometry: ROI,
        scale: 10,
        bestEffort: true,
      });

    // Display the area calculation outputs in the Console.
    print('riparian area per uncertainty class', rip_class_areas);

// Export cover change classification. This line can be used to export the
    // cover change classification to Google Drive, where it can be downloaded
    // as a georeferenced TIFF file, or to Assets, from where it can be Imported
    // into other GEE scripts for further analysis, to share with others or to be
    // accessed by GEE Apps.
    Export.image.toDrive({
               image: class_ROI,
               description: 'StabilityClass_ROI',
               scale: 10,
               maxPixels: 1e9,
               region: ROI
               });
