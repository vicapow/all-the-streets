for i in $(find . -name *.shp | xargs); do
  ogr2ogr -t_srs EPSG:4326 -f GeoJSON $(dirname $i)/data.json $i;
  topojson -o $(dirname)/data.topojson $(dirname $i)/data.json;
done
