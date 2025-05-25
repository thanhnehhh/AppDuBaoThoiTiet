import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from "react-native";
import { useWeather } from '../context/weather_context';
import { useRouter } from "expo-router";
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from "react-native-gesture-handler";
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Entypo from '@expo/vector-icons/Entypo';
import { MaterialCommunityIcons } from "@expo/vector-icons";
import dataCities from '../assets/data/cities.json'; // Đổi tên biến để tránh nhầm lẫn
import { Image as ExpoImage } from 'expo-image';

const temperCelsius = <MaterialCommunityIcons name="temperature-celsius" size={16} color="white" />;
const temperCelsiusMedium = <MaterialCommunityIcons name="temperature-celsius" size={30} color="white" />;
const apiKey = 'bffd2370ad6ad9d6d5d7dc8088f85a8e'; // KHÓA API CỦA BẠN

export default function CityManagement() { // Đổi tên component từ SettingsScreen sang CityManagement
  const router = useRouter();
  const { cities, setCities, favoriteCity, setFavoriteCity } = useWeather();
  // weatherToday ở đây có thể không cần thiết nếu bạn chỉ muốn hiển thị thông tin các otherCity
  // const [weatherToday, setWeatherToday] = useState(null);
  const [otherCity, setOtherCity] = useState(new Map());

  // Fetch weather data for all listed cities
  useEffect(() => {
    let isMounted = true;

    const fetchCity = async (city) => {
        if (!city || typeof city !== 'string') return;
        const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&units=metric&appid=${apiKey}`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            if (!response.ok) {
                console.error(`Lỗi API khi lấy dữ liệu thành phố ${city}:`, data.message || 'Lỗi không xác định');
                // Xóa thành phố khỏi map nếu không tìm thấy dữ liệu
                if (isMounted) {
                    setOtherCity(prev => {
                        const newMap = new Map(prev);
                        newMap.delete(city);
                        return newMap;
                    });
                }
                return;
            }
            if (isMounted) {
                setOtherCity(prev => {
                    const newMap = new Map(prev);
                    newMap.set(city, {
                        icon: data.list?.[0]?.weather?.[0]?.icon || '',
                        temp: data.list?.[0]?.main?.temp || 0,
                        temp_min: data.list?.[0]?.main?.temp_min || 0,
                        temp_max: data.list?.[0]?.main?.temp_max || 0
                    });
                    return newMap;
                });
            }
        } catch (err) {
            console.error('Lỗi khi lấy dữ liệu thời tiết:', err);
            if (isMounted) {
                setOtherCity(prev => {
                    const newMap = new Map(prev);
                    newMap.delete(city);
                    return newMap;
                });
            }
        }
    };

    if (cities.length > 0) {
      // Chỉ gọi fetchCity cho mỗi thành phố trong danh sách `cities`
      cities.forEach(city => fetchCity(city));
    }

    return () => {
      isMounted = false;
    };
  }, [cities]); // Dependency array bao gồm cities

  const getCountry = (city) => {
    const foundCity = dataCities.find(c => c.name === city);
    return foundCity ? foundCity.country : '--';
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
    router.replace('/'); // Navigate back to HomeScreen (Index)
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
          <Text style={[{ fontSize: 22 }, styles.textWhite]}>Location Management</Text>
        </View>
        <View style={[styles.betweenJusty, styles.flexRow]}>
          <TouchableOpacity onPress={() => router.push("/CityResearch")}>
            <MaterialIcons name="add" size={35} color="black" />
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
        favoriteCity.map(city => {
          const info = otherCity.get(city);
          return (
            <TouchableOpacity key={city} onPress={() => selectCity(city)} style={[styles.p30, styles.flexRow, styles.betweenJusty, { height: 100, backgroundColor: '#006888', width: '99%', borderRadius: 25, marginBottom: 10, alignSelf: 'center' }]}>
              <View>
                <Text style={[styles.textWhite, { fontSize: 20 }]}>{city}</Text>
                <Text style={[styles.textWhite, { fontSize: 11 }]}>{getCountry(city)}</Text>
              </View>
              <View>
                <View style={[styles.flexRow, { justifyContent: 'center' }]}>
                  <ExpoImage
                    source={info?.icon ? { uri: iconWeather(info.icon) } : require('../assets/images/sun.png')}
                    style={{ width: 30, height: 30 }}
                  />
                  <Text style={[styles.textWhite, { fontSize: 30, paddingStart: 10 }]}>
                    {info?.temp || '--'}{temperCelsiusMedium}
                  </Text>
                </View>
                <View style={[{ alignItems: 'flex-end', marginTop: 5 }]}>
                  <Text style={[styles.textWhite]}>
                    {info?.temp_min || '--'}{temperCelsius}/{info?.temp_max || '--'}{temperCelsius}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })
      ) : (
        <Text style={[styles.textWhite, { padding: 30, fontSize: 15 }]}>Không có thành phố yêu thích nào được chọn</Text>
      )}

      <View style={[styles.flexRow, styles.betweenJusty]}>
        <Text style={[styles.textWhite, styles.p10, { paddingStart: 30, fontSize: 15 }]}>Other locations</Text>
      </View>

      <View style={{ flex: 1, gap: 10, borderRadius: 25, overflow: 'hidden' }}>
        <ScrollView showsHorizontalScrollIndicator={false}>
          {cities.filter(city => !favoriteCity.includes(city)).length > 0 ? (
            cities.filter(city => !favoriteCity.includes(city)).map(city => {
              const info = otherCity.get(city);
              return (
                <View key={city} style={[{ alignItems: 'center', marginBottom: 10 }]}>
                  <View style={[styles.p30, styles.flexRow, styles.betweenJusty, { height: 100, backgroundColor: '#006888', width: '99%', borderRadius: 25 }]}>
                    <TouchableOpacity onPress={() => selectCity(city)}>
                      <Text style={[styles.textWhite, { fontSize: 20 }]}>{city}</Text>
                      <Text style={[styles.textWhite, { fontSize: 11 }]}>{getCountry(city)}</Text>
                    </TouchableOpacity>
                    <View style={[styles.flexRow, { alignItems: 'center' }]}>
                      <View>
                        <View style={[styles.flexRow, { justifyContent: 'center' }]}>
                          <ExpoImage
                            source={info?.icon ? { uri: iconWeather(info.icon) } : require('../assets/images/sun.png')}
                            style={{ width: 40, height: 40 }}
                          />
                          <Text style={[styles.textWhite, { fontSize: 30, paddingStart: 10 }]}>{info?.temp || '--'}{temperCelsiusMedium}</Text>
                        </View>
                        <View style={[{ alignItems: 'flex-end', marginTop: 5 }]}>
                          <Text style={[styles.textWhite]}>{info?.temp_min || '--'}{temperCelsius}/{info?.temp_max || '--'}{temperCelsius}</Text>
                        </View>
                      </View>
                      <TouchableOpacity onPress={() => toggleFavorite(city)} style={{ paddingLeft: 10 }}>
                        <MaterialIcons name={favoriteCity.includes(city) ? "star" : "star-border"} size={24} color="white" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={[styles.textWhite, { padding: 30, fontSize: 15 }]}>Không có địa điểm khác</Text>
          )}
        </ScrollView>
      </View>

      <View style={{ width: '100%', paddingHorizontal: 10 }}>
        <View style={[styles.footer]}>
          <View style={{ flexDirection: 'row' }}>
            <ExpoImage source={require('../assets/images/paper.png')} style={{ width: 18, height: 18, marginEnd: 4 }} />
            <Text style={[styles.grayC]}>The Weather Channel</Text>
          </View>
          <Text style={[styles.grayC]}>Đã cập nhật: {new Date().toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})} {new Date().toLocaleDateString('vi-VN', {day:'2-digit', month:'2-digit'})}</Text>
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