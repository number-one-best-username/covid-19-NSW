{-# LANGUAGE OverloadedStrings, DeriveGeneric #-}

module GeoJson where

import Data.Aeson
import qualified Data.ByteString.Lazy.Char8 as BS
import Data.Geospatial
import GHC.Generics
import qualified Data.Sequence as S
import qualified Data.Map as M
import Data.LinearRing
import Data.Validation

import InfectionSource (fetchInfectionSource)

encodeGeoJson :: IO (BS.ByteString)
encodeGeoJson = do
  postcodeLonLat <- fetchPostcodeGeo
  return $ case postcodeLonLat of
             Nothing -> encode ("0" :: String)
             Just v -> encode v

data Properties = Properties {
  postcode' :: String,
  area' :: Double
  } deriving (Show)
instance FromJSON Properties where
    parseJSON = withObject "Properties" $ \v -> Properties
        <$> v .: "postcode"
        <*> v .: "area"

data NewProps = NewProps {
  postcode :: String,
  area :: Double,
  infections :: Infections
  } deriving (Generic)
instance ToJSON NewProps where

type Infections = M.Map String (M.Map String Int)

fetchPostcodeGeo :: IO (Maybe (GeoFeatureCollection NewProps))
fetchPostcodeGeo = do
  theMap <- fetchInfectionSource
  decodeFileStrict "postcode_point.json" >>= return . fmap (
    \(GeoFeatureCollection box geo) -> GeoFeatureCollection box (fmap (geoFeature theMap) . S.filter (inMap theMap) $ geo)
    )

inMap :: Eq a => M.Map String a -> GeoFeature Properties -> Bool
inMap theMap (GeoFeature _ _ props _) = M.lookup (postcode' props) theMap /= Nothing

geoFeature :: M.Map String Infections -> GeoFeature Properties -> GeoFeature NewProps
geoFeature theMap (GeoFeature bb geo props fid) = GeoFeature bb geo newProps fid
  where newProps = case M.lookup (postcode' props) theMap of
          Nothing -> NewProps (postcode' props) (area' props) M.empty
          Just props' -> NewProps (postcode' props) (area' props) props'
