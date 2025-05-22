import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from "react-native";
import { useWeather } from '../context/weather_context';
import { useRouter } from "expo-router";
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from "react-native-gesture-handler";
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Entypo from '@expo/vector-icons/Entypo';
import { MaterialCommunityIcons } from "@expo/vector-icons";
import dataCities from '../assets/data/cities.json';
import { Image as ExpoImage } from 'expo-image';

const temperCelsius = <MaterialCommunityIcons name="temperature-celsius" size={16} color="white" />;
const temperCelsiusMedium = <MaterialCommunityIcons name="temperature-celsius" size={30} color="white" />;
const apiKey = 'bffd2370ad6ad9d6d5d7dc8088f85a8e';

export default function SettingsScreen() {
  const router = useRouter();
  const { cities, setCities, favoriteCity, setFavoriteCity } = useWeather();
  const [weatherToday, setWeatherToday] = useState(null);
  const [otherCity, setOtherCity] = useState(new Map());

  // Fetch weather data
  useEffect(() => {
    let isMounted = true;

    const fetchWeather = async (city) => {
      const url = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&appid=${apiKey}`;
      try {
        const response = await fetch(url);
        const data = await response.json();
        if (isMounted) {
          setWeatherToday(data.list[0]);
        }
      } catch (err) {
        console.error('Error fetching weather data:', err);
      }
    };

    const fetchCity = async (city) => {
      const url = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&appid=${apiKey}`;
      try {
        const response = await fetch(url);
        const data = await response.json();
        if (isMounted) {
          setOtherCity(prev => {
            const newMap = new Map(prev);
            newMap.set(city, {
              icon: data.list[0]?.weather?.[0]?.icon,
              temp: data.list[0].main.temp,
              temp_min: data.list[0].main.temp_min,
              temp_max: data.list[0].main.temp_max
            });
            return newMap;
          });
        }
      } catch (err) {
        console.error('Error fetching weather data:', err);
      }
    };

    if (cities.length > 0) {
      fetchWeather(cities[0]);
      cities.forEach(city => fetchCity(city));
    }

    return () => {
      isMounted = false;
    };
  }, [cities, favoriteCity]);

  const getCountry = (city) => {
    return dataCities.find(c => c.name === city);
  };

  const toggleFavorite = (city) => {
    if (favoriteCity.includes(city)) {
      setFavoriteCity(favoriteCity.filter(c => c !== city));
    } else {
      setFavoriteCity([...favoriteCity, city]);
    }
  };

  const selectCity = (city) => {
    const newCities = [city, ...cities.filter(c => c !== city)];
    setCities(newCities);
    router.back(); // Navigate back to Index
  };

  const iconWeather = (iconCode) => {
    return iconCode ? `https://openweathermap.org/img/wn/${iconCode}@2x.png` : null;
  };

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#005972', paddingTop: 5 }}>
      <View style={[styles.flexRow, styles.betweenJusty]}>
        <View style={styles.flexRow}>
          <TouchableOpacity onPress={() => router.replace('/')} style={[{ paddingStart: 30, paddingEnd: 10 }]}>
            <MaterialIcons name="arrow-back-ios" size={26} color="white" />
          </TouchableOpacity>
          <Text style={[{ fontSize: 22 }, styles.textWhite]}>Quản lý vị trí</Text>
        </View>
        <View style={[styles.betweenJusty, styles.flexRow]}>
          <TouchableOpacity style={styles.p10} onPress={() => router.push("/ResearchCity")}>
            <MaterialIcons name="add" size={35} color="white" />
          </TouchableOpacity>
          <TouchableOpacity style={{ paddingEnd: 20 }}>
            <Entypo name="dots-three-vertical" size={22} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.flexRow, styles.betweenJusty]}>
        <Text style={[styles.textWhite, styles.p10, { paddingStart: 30, fontSize: 15 }]}>Favorite location</Text>
        <MaterialIcons style={{ paddingEnd: 30 }} name="error-outline" size={20} color="white" />
      </View>

      {/* Favorite Cities */}
      {favoriteCity.length > 0 ? (
        favoriteCity.map(city => (
          <TouchableOpacity key={city} onPress={() => selectCity(city)} style={[styles.p30, styles.flexRow, styles.betweenJusty, { height: 100, backgroundColor: '#006888', width: '99%', borderRadius: 25, marginBottom: 10 }]}>
            <View>
              <Text style={[styles.textWhite, { fontSize: 20 }]}>{city}</Text>
              <Text style={[styles.textWhite, { fontSize: 11 }]}>{getCountry(city)?.country || '--'}</Text>
            </View>
            <View>
              <View style={[styles.flexRow, { justifyContent: 'center' }]}>
                <ExpoImage
                  source={{ uri: iconWeather(otherCity.get(city)?.icon) || require('../assets/images/sun.png') }}
                  style={{ width: 30, height: 30 }}
                />
                <Text style={[styles.textWhite, { fontSize: 30, paddingStart: 10 }]}>
                  {otherCity.get(city)?.temp || '--'}{temperCelsiusMedium}
                </Text>
              </View>
              <View style={[{ alignItems: 'flex-end', marginTop: 5 }]}>
                <Text style={[styles.textWhite]}>
                  {otherCity.get(city)?.temp_min || '--'}{temperCelsius}/{otherCity.get(city)?.temp_max || '--'}{temperCelsius}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))
      ) : (
        <Text style={[styles.textWhite, { padding: 30, fontSize: 15 }]}>No favorite cities selected</Text>
      )}

      <View style={[styles.flexRow, styles.betweenJusty]}>
        <Text style={[styles.textWhite, styles.p10, { paddingStart: 30, fontSize: 15 }]}>Other locations</Text>
      </View>

      <View style={{ flex: 1, gap: 10, borderRadius: 25, overflow: 'hidden' }}>
        <ScrollView showsHorizontalScrollIndicator={false}>
          {otherCity.size > 0 ? (
            Array.from(otherCity.entries()).map(([city, info]) => (
              <View key={city} style={[{ alignItems: 'center', marginBottom: 10 }]}>
                <View style={[styles.p30, styles.flexRow, styles.betweenJusty, { height: 100, backgroundColor: '#006888', width: '99%', borderRadius: 25 }]}>
                  <TouchableOpacity onPress={() => selectCity(city)}>
                    <Text style={[styles.textWhite, { fontSize: 20 }]}>{city}</Text>
                    <Text style={[styles.textWhite, { fontSize: 11 }]}>{getCountry(city)?.country || '--'}</Text>
                  </TouchableOpacity>
                  <View style={[styles.flexRow, { alignItems: 'center' }]}>
                    <View>
                      <View style={[styles.flexRow, { justifyContent: 'center' }]}>
                        <ExpoImage
                          source={{ uri: iconWeather(info.icon) || require('../assets/images/sun.png') }}
                          style={{ width: 40, height: 40 }}
                        />
                        <Text style={[styles.textWhite, { fontSize: 30, paddingStart: 10 }]}>{info.temp || '--'}{temperCelsiusMedium}</Text>
                      </View>
                      <View style={[{ alignItems: 'flex-end', marginTop: 5 }]}>
                        <Text style={[styles.textWhite]}>{info.temp_min || '--'}{temperCelsius}/{info.temp_max || '--'}{temperCelsius}</Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => toggleFavorite(city)} style={{ paddingLeft: 10 }}>
                      <MaterialIcons name={favoriteCity.includes(city) ? "star" : "star-border"} size={24} color="white" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <Text style={[styles.textWhite, { padding: 10 }]}>Đang tải dữ liệu...</Text>
          )}
        </ScrollView>
      </View>

      <View style={{ width: '100%', paddingHorizontal: 10 }}>
        <View style={[styles.footer]}>
          <View style={{ flexDirection: 'row' }}>
            <ExpoImage source={require('../assets/images/paper.png')} style={{ width: 18, height: 18, marginEnd: 4 }} />
            <Text style={[styles.grayC]}>The Weather Channel</Text>
          </View>
          <Text style={[styles.grayC]}>Đã cập nhật 15:14 04/3</Text>
        </View>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  betweenJusty: { justifyContent: 'space-between' },
  grayC: { color: 'gray' },
  textWhite: { color: 'white' },
  p10: { padding: 10 },
  p30: { padding: 30 },
  flexRow: { flexDirection: 'row', alignItems: 'center' },
  footer: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', padding: 10 }
});