# CBEM
Scripts and documentation to accompany manuscript under review at BioScience (Stahl et al., in review). Please refer to the manuscript for background information about the study area.
These scripts will be updated to reflect changes to the Earth Engine library of functions or upon request. 

Script 1: Inspect imagery, classify cover, and evaluate accuracy

This script was coded in JavaScript in the Google Earth Engine (GEE) code editor. It executes the following tasks as implemented in the study area, eastern Washington State, USA. 

I.	Search for all available Sentinel-2 satellite imagery in the study area over the time period of interest.

II.	Create an average (median) composite image for each specified time interval, discarding the cloudiest images and replacing any remaining cloudy pixels with pixels from another date.

III.	Compute indices of vegetation vigor from the composite images.

IV.	Build and train a model to classify land cover with selected bands and indices from the composite images.

V.	Apply the model to classify land cover in other areas or timeframes (compared to the image that was used to train the model. 

VI.	Evaluate the accuracy of the model with an independent set of validation polygons.

All lines of code provided in the scripts in this repository can be copied and pasted directly into the Earth Engine Code Editor (https://code.earthengine.google.com/) once a user account has been created. Comments above each block of code indicate what those lines accomplish and how they can be adapted to different study areas or timeframes. Note that “//” marks text that will be disregarded by GEE, so such lines can be copied directly into the Code Editor for quick reference. In some instances, “//” are used to prevent lines of code from being executed during a given model run. This helps to manage performance and keep each run of the script within the memory limitations of GEE.  

Additional Notes:
In Earth Engine, "Assets" provide a way of importing GIS files that were created outside of GEE. They also enable the user to save outputs from a previous run of the script so that they can be imported back into the script for quick analysis with minimal memory usage. The comment lines below are simply a note to indicate that some of the objects used in this script are stored as Assets, either before any lines are executed (e.g., the study area outline) or during the execution of the script (e.g., hand-drawn polygons and classified image composites). Below we have added two lines of code to create a simple rectangular polygon outlining the study are for this script. It covers the area analyzed by Stahl et al. 2021. 

If you wish to analyze a different area, you have three options. 
(1)	Enter bounding coordinates (longitude, latitude in decimal degrees) to outline a study area anywhere on the globe. 
(2)	Draw a polygon or rectangle on the map. Exit drawing, then hover over the geometry layer to open the geometry settings, rename it “ROI” and choose to import it as a FeatureCollection. 
(3)	If you have a shapefile for your study area, you can import it as an Asset (upload the 6 files that comprise the shapefile, leaving out the “.sbx” if there is one. Alternatively, you can upload a single zip file containing the 6 files in the shapefile). After it has been ingested (check Task pane for progress), import the Asset into this script, and then assign it to a variable by clicking “table” and replacing it with “ROI” – those steps will change the study area in this script.

Note that a larger study area may take longer to process requests. 

Regarding portions of images obscured by clouds:
In script 1, we will apply a function to mask clouds each time we create a composite image. The cloud mask function in the lines below is written near the top of the script so that it will be available when called later on. Sentinel imagery has a band labeled ‘QA’ that indicates cloud cover; that is what is used here. Other image sources such as Landsat imagery have searchable code snippets to deal with clouds.

Regarding Sentinel-2 products:
Because the study area is semi-arid and the time interval was during the dry season, we were able to reliably use the top of atmosphere (Level 1C) product. Sentinel-2 imagery pre-processed for surface reflectance (Level-2A) is becoming available on GEE and may be more appropriate to use in some settings. First, we well query and create composite image to train the classifier. Then we will repeat the same process to query and composite an image to classify.

Regarding land cover classification in Script 1
The script executes the land cover classification in the accompanying article (Stahl et al. 2021). Before these code lines can be used, one or more datasets is needed for model training and validation. These input data can be generated from existing field data or spatial datasets related to land cover that are available for the area to be used for model training. In this case, we used visual inspection and local knowledge of the study area to hand-draw polygons representing each cover class. To do this, we referred to Google Earth imagery, NAIP (National Agricultural Imagery Program, US Department of Agriculture) aerial imagery, and Sentinel-2 satellite imagery. Through visual interpretation, we identified areas as open water, impervious surfaces, green vegetation, or brown vegetation (including bare soil).


