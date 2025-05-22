
import { Image, StyleSheet, View, Text, ImageBackground, Dimensions, ScrollView, TouchableOpacity, Animated, FlatList, Switch, Modal } from 'react-native';
import AntDesign from '@expo/vector-icons/AntDesign';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SimpleLineIcons } from '@expo/vector-icons';
import { useRouter } from "expo-router";
import { Image as ExpoImage } from 'expo-image';
import { useWeather } from '../context/weather_context';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const temperCelsiusBlack = <MaterialCommunityIcons name="temperature-celsius" size={45} color="black" />;
const temperCelsiusBlackMedium = <MaterialCommunityIcons name="temperature-celsius" size={16} color="black" />;
const temperCelsiusGray = <MaterialCommunityIcons name="temperature-celsius" size={13} color="gray" />;
const temperCelsiusGrayMedium = <MaterialCommunityIcons name="temperature-celsius" size={16} color="gray" />;
const apiKey = 'bffd2370ad6ad9d6d5d7dc8088f85a8e';

const { width } = Dimensions.get('window');
const MENU_WIDTH = width * 0.85;

const HomeScreen = () => {
  const [translateX, setTranslateX] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [weatherToday, setWeatherToday] = useState(null);
  const [forecastData, setForecastData] = useState([]);
  const [cityTimezone, setCityTimezone] = useState(0);
  const { cities, setCities, favoriteCity } = useWeather();
  const router = useRouter();
  const [otherCity, setOtherCity] = useState(new Map());
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notificationHour, setNotificationHour] = useState(6);
  const [showHourModal, setShowHourModal] = useState(false);

  const toggleMenu = () => {
    setTranslateX(isOpen ? 0 : MENU_WIDTH);
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    let isMounted = true;

    const fetchWeather = async (city) => {
      if (!city || typeof city !== 'string') return;
      const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&units=metric&appid=${apiKey}`;
      try {
        const response = await fetch(url);
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'API request failed');
        if (isMounted) {
          setForecastData(data.list || []);
          setWeatherToday(data.list?.[0] || null);
          setCityTimezone(data.city?.timezone || 0);
        }
      } catch (err) {
        console.error('Error fetching weather data:', err);
      }
    };

    const fetchCity = async (city) => {
      if (!city || typeof city !== 'string') return;
      const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&units=metric&appid=${apiKey}`;
      try {
        const response = await fetch(url);
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'API request failed');
        if (isMounted) {
          setOtherCity(prev => {
            const newMap = new Map(prev);
            newMap.set(city, {
              icon: data.list?.[0]?.weather?.[0]?.icon || '',
              temp: data.list?.[0]?.main?.temp || 0
            });
            return newMap;
          });
        }
      } catch (err) {
        console.error('Error fetching city weather data:', err);
      }
    };

    if (cities.length > 0) {
      fetchWeather(cities[0]);
      cities.forEach(city => fetchCity(city));
    }

    return () => {
      isMounted = false;
    };
  }, [cities]);

  useEffect(() => {
    const setupNotifications = async () => {
      if (Platform.OS === 'web') return;

      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('Notification permissions not granted');
        setNotificationsEnabled(false);
        await AsyncStorage.setItem('notifications_enabled', 'false');
        return;
      }

      // Load saved notification settings
      const savedEnabled = await AsyncStorage.getItem('notifications_enabled');
      const savedHour = await AsyncStorage.getItem('notification_hour');
      if (savedEnabled !== null) {
        setNotificationsEnabled(savedEnabled === 'true');
      }
      if (savedHour !== null) {
        setNotificationHour(parseInt(savedHour, 10));
      }

      if (cities.length > 0) {
        await AsyncStorage.setItem('default_city', cities[0]);
      }

      await Notifications.cancelAllScheduledNotificationsAsync();

      if (notificationsEnabled) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "\uD83C\uDF24\uFE0F Good Morning!",
            body: `Check today's weather in ${cities[0] || 'your city'}`,
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
          },
          trigger: {
            hour: notificationHour,
            minute: 0,
            repeats: true,
          },
        });

        console.log(`Scheduled daily ${notificationHour}:00 weather notification`);
      }
    };

    setupNotifications();
  }, [cities, notificationsEnabled, notificationHour]);

  const toggleNotifications = async () => {
    const newState = !notificationsEnabled;
    setNotificationsEnabled(newState);
    await AsyncStorage.setItem('notifications_enabled', newState.toString());

    if (!newState) {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('Notifications disabled');
    }
  };

  const handleHourChange = async (hour) => {
    setNotificationHour(hour);
    await AsyncStorage.setItem('notification_hour', hour.toString());
    setShowHourModal(false);
  };

  const setIndex = (city) => {
    const newCities = [city, ...cities.filter(c => c !== city)];
    setCities(newCities);
    toggleMenu();
  };

  const iconWeather = (iconCode) => {
    return iconCode ? `https://openweathermap.org/img/wn/${iconCode}@2x.png` : '';
  };

  const formatTime = (timestamp) => {
    if (!timestamp || !cityTimezone) return '--:--';
    const localOffset = new Date().getTimezoneOffset() * 60 * 1000;
    const cityTime = new Date(timestamp * 1000 + localOffset + cityTimezone * 1000);
    const hours = cityTime.getHours().toString().padStart(2, '0');
    const minutes = cityTime.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const getLocalTime = () => {
    if (!cityTimezone) return 'Loading...';
    const now = Date.now();
    const localOffset = new Date().getTimezoneOffset() * 60 * 1000;
    const cityTime = new Date(now + localOffset + cityTimezone * 1000);
    const options = {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    };
    return cityTime.toLocaleString('vi-VN', options).replace(',', '');
  };

  const getPredict2DaysForecast = () => {
    if (!cityTimezone || !forecastData.length) return [];

    const now = Date.now();
    const localOffset = new Date().getTimezoneOffset() * 60 * 1000;
    const cityCurrentTime = now + localOffset + cityTimezone * 1000;
    const predictTime = cityCurrentTime + 48 * 60 * 60 * 1000; // 48 hours

    return forecastData.filter(item => {
      const forecastTime = item.dt * 1000 + localOffset + cityTimezone * 1000;
      return forecastTime >= cityCurrentTime && forecastTime <= predictTime;
    });
  };

  const hours = [...Array(24).keys()].map(hour => ({ id: hour, label: `${hour}:00` }));

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ImageBackground
        source={require('../assets/images/backgroundWeatherApp.jpg')}
        style={styles.background}
      >
        {/* Menu */}
        <Animated.View style={[styles.menu, { transform: [{ translateX: translateX }] }]}>
          <View style={[{ flexDirection: 'row', justifyContent: 'space-between' }]}>
            <TouchableOpacity onPress={toggleMenu} style={[styles.p20]}>
              <AntDesign name="close" size={30} color="black" />
            </TouchableOpacity>
            <AntDesign name="setting" size={30} style={styles.p20} color="black" />
          </View>

          <ScrollView style={[styles.menuContent]}>
            <View style={[styles.center, styles.jusBetween, { height: 40 }]}>
              <View style={[styles.center, { flexDirection: 'row' }]}>
                <AntDesign name="star" size={24} color="blue" />
                <Text style={[{ paddingStart: 10, fontWeight: 600, fontSize: 17 }, styles.grayC]}>
                  Favorite locations
                </Text>
              </View>
              <MaterialIcons name="error-outline" size={24} color="gray" />
            </View>

            {favoriteCity.map(city => {
              const info = otherCity.get(city);
              return (
                <View key={city} style={[styles.center, styles.jusBetween, { height: 50, paddingStart: 20 }]}>
                  <View style={[styles.center, { flexDirection: 'row' }]}>
                    <MaterialIcons name="location-on" size={15} color="black" />
                    <TouchableOpacity onPress={() => setIndex(city)}>
                      <Text style={[{ paddingStart: 10, fontWeight: 600, fontSize: 17 }, styles.grayC]}>
                        {city}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={[styles.jusBetween, { gap: 10 }]}>
                    <ExpoImage
                      source={info?.icon ? { uri: iconWeather(info.icon) } : require('../assets/images/cloudy.png')}
                      style={{ width: 20, height: 20 }}
                      onError={(error) => console.error('Favorite city image error:', error)}
                    />
                    <Text>{info?.temp || '--'}{temperCelsiusBlackMedium}</Text>
                  </View>
                </View>
              );
            })}

            <View style={{ width: '100%', height: 1, backgroundColor: 'black', marginTop: 20 }}></View>

            <View style={[styles.center, styles.jusBetween, { height: 40, marginTop: 30 }]}>
              <View style={[styles.center, { flexDirection: 'row' }]}>
                <MaterialIcons name="add-location" size={24} color="gray" />
                <Text style={[{ paddingStart: 10, fontWeight: 600, fontSize: 17 }, styles.grayC]}>
                  Other locations
                </Text>
              </View>
            </View>

            {cities.filter(city => !favoriteCity.includes(city)).map(city => {
              const info = otherCity.get(city);
              return (
                <View key={city} style={[styles.center, styles.jusBetween, { height: 50, paddingStart: 20 }]}>
                  <View style={[styles.center, { flexDirection: 'row' }]}>
                    <TouchableOpacity onPress={() => setIndex(city)}>
                      <Text style={[{ paddingStart: 10, fontSize: 17, fontWeight: 400, color: 'black' }]}>
                        {city}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={[styles.jusBetween, { gap: 10 }]}>
                    <ExpoImage
                      source={info?.icon ? { uri: iconWeather(info.icon) } : require('../assets/images/cloudy.png')}
                      style={{ width: 20, height: 20 }}
                    />
                    <Text>{info?.temp || '--'}{temperCelsiusBlackMedium}</Text>
                  </View>
                </View>
              );
            })}

            <View style={{ alignItems: 'center' }}>
              <TouchableOpacity style={styles.manageLocBtn} onPress={() => router.push("/CityManagement")}>
                <Text style={{ fontSize: 18, fontWeight: '500' }}>Location management</Text>
              </TouchableOpacity>
            </View>

            <View style={{ height: 1, width: '100%', backgroundColor: 'black', marginTop: 30, marginBottom: 30 }}></View>

            <View style={[styles.center, styles.jusBetween, { height: 40, marginBottom: 15 }]}>
              <View style={[styles.center, { flexDirection: 'row' }]}>
                <AntDesign name="notification" size={22} color="gray" />
                <Text style={[{ paddingStart: 20, fontWeight: 400, fontSize: 20 }]}>Notification Settings</Text>
              </View>
            </View>

            <View style={[styles.center, styles.jusBetween, { height: 40, marginBottom: 15, paddingStart: 20 }]}>
              <Text style={[{ fontSize: 17, fontWeight: 400, color: 'black' }]}>Enable Notifications</Text>
              <Switch
                value={notificationsEnabled}
                onValueChange={toggleNotifications}
                trackColor={{ false: '#767577', true: '#81b0ff' }}
                thumbColor={notificationsEnabled ? '#f4f3f4' : '#f4f3f4'}
              />
            </View>

            <View style={[styles.center, styles.jusBetween, { height: 40, marginBottom: 15, paddingStart: 20 }]}>
              <Text style={[{ fontSize: 17, fontWeight: 400, color: 'black' }]}>Notification Time</Text>
              <TouchableOpacity
                onPress={() => notificationsEnabled && setShowHourModal(true)}
                style={[styles.timeButton, { opacity: notificationsEnabled ? 1 : 0.5 }]}
              >
                <Text style={{ fontSize: 16, color: 'black' }}>{`${notificationHour}:00`}</Text>
                <AntDesign name="down" size={16} color="black" />
              </TouchableOpacity>
            </View>

            <Modal
              visible={showHourModal}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setShowHourModal(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <FlatList
                    data={hours}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.hourItem}
                        onPress={() => handleHourChange(item.id)}
                      >
                        <Text style={styles.hourText}>{item.label}</Text>
                      </TouchableOpacity>
                    )}
                    style={styles.hourList}
                  />
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setShowHourModal(false)}
                  >
                    <Text style={styles.closeButtonText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>

            <View style={[styles.center, styles.jusBetween, { height: 40, marginBottom: 15 }]}>
              <View style={[styles.center, { flexDirection: 'row' }]}>
                <SimpleLineIcons name="earphones-alt" size={22} color="gray" />
                <Text style={[{ paddingStart: 20, fontWeight: 400, fontSize: 20 }]}>Liên hệ chúng tôi</Text>
              </View>
            </View>

            <View style={[styles.center, styles.jusBetween, { height: 40, marginBottom: 15 }]}>
              <View style={[styles.center, { flexDirection: 'row' }]}>
                <AntDesign name="questioncircle" size={22} color="gray" />
                <Text style={[{ paddingStart: 20, fontWeight: 400, fontSize: 20 }]}>Cách sử dụng</Text>
              </View>
            </View>
          </ScrollView>
        </Animated.View>

        {/* Main Weather Display */}
        <Animated.View style={[styles.container, { transform: [{ translateX: translateX }] }]}>
          <View style={styles.menubar}>
            <TouchableOpacity onPress={toggleMenu}>
              <MaterialIcons name="menu" size={30} color="black" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/ResearchCity")}>
              <MaterialIcons name="add" size={35} color="black" />
            </TouchableOpacity>
          </View>

          {/* Show weather today and hours */}
          <ScrollView style={[styles.srollview]}>
            <View style={styles.title}>
              <Text style={styles.titleStyle}>Weather</Text>
            </View>
            <View style={styles.weatherdetail}>
              <View style={styles.p20}>
                <Text style={{ fontSize: 30 }}>{cities[0] || 'Unknown'} City</Text>
                <Text>{getLocalTime()}</Text>
              </View>
              <View style={{ flexDirection: "row", height: 80, alignItems: 'center' }}>
                {weatherToday?.weather?.[0]?.icon && (
                  <ExpoImage
                    source={{ uri: iconWeather(weatherToday.weather[0].icon) }}
                    style={{ width: 60, height: 60, marginStart: 20, marginEnd: 20 }}
                    onError={(error) => console.error('Weather today image error:', error)}
                  />
                )}
                <View>
                  {weatherToday ? (
                    <Text style={{ fontSize: 40 }}>{weatherToday.main.temp}{temperCelsiusBlack}</Text>
                  ) : (
                    <Text>Loading...</Text>
                  )}
                </View>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'flex-end', marginRight: 20 }}>
                  {weatherToday ? (
                    <>
                      <Text style={styles.grayC}>{weatherToday.weather[0].description}</Text>
                      <Text style={styles.grayC}>
                        {weatherToday.main.temp_min}{temperCelsiusGray}/{weatherToday.main.temp_max}{temperCelsiusGray}
                      </Text>
                      <Text style={styles.grayC}>Feel like: {weatherToday.main.feels_like}{temperCelsiusGray}</Text>
                    </>
                  ) : (
                    <Text>Loading...</Text>
                  )}
                </View>
              </View>
              <View style={{ width: '100%', alignItems: 'center', flex: 1 }}>
                <Text style={[styles.textNormal, { marginLeft: 20, marginTop: 20, fontWeight: '600' }]}>2 Days Forecast</Text>
                <View style={{ width: '94%', flexDirection: 'row', marginTop: 10, marginBottom: 20 }}>
                  <FlatList
                    data={getPredict2DaysForecast()}
                    keyExtractor={(item, index) => index.toString()}
                    renderItem={({ item }) => (
                      <View style={[styles.subWeather, { marginStart: 8, width: 80 }]}>
                        <Text style={styles.grayText}>{formatTime(item.dt)}</Text>
                        <ExpoImage
                          source={item?.weather?.[0]?.icon ? { uri: iconWeather(item.weather[0].icon) } : require('../assets/images/cloudy.png')}
                          style={{ width: 20, height: 20 }}
                        />
                        <Text style={{ fontSize: 14, color: 'black', fontWeight: '600' }}>
                          {item.main.temp}{temperCelsiusBlackMedium}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Image
                            source={require('../assets/images/water_drop.png')}
                            style={{ width: 15, height: 15 }}
                          />
                          <Text style={{ color: 'gray' }}>{item.main.humidity}%</Text>
                        </View>
                      </View>
                    )}
                    horizontal={true}
                    showsHorizontalScrollIndicator={false}
                  />
                </View>
              </View>
            </View>

            <View style={{ height: 1, backgroundColor: 'gray', width: '90%', marginTop: 20 }}></View>

            {/* Moisture */}
            <View style={[{ padding: 10, width: '90%' }]}>
              <View style={[{ flexDirection: 'row', justifyContent: 'space-between' }]}>
                <View style={[{ flexDirection: 'row', gap: 10 }]}>
                  <ExpoImage
                    source={require('../assets/images/humidity.png')}
                    style={{ width: 25, height: 25 }}
                  />
                  <Text style={[styles.textNormal, styles.grayC]}>Moisture</Text>
                </View>
                {weatherToday ? (
                  <Text style={[styles.textNormal, { fontWeight: 600 }]}>{weatherToday.main.humidity}%</Text>
                ) : (
                  <Text>Loading data...</Text>
                )}
              </View>

              {/* Wind Speed */}
              <View style={[{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 }]}>
                <View style={[{ flexDirection: 'row', gap: 10 }]}>
                  <ExpoImage
                    source={require('../assets/images/wind.png')}
                    style={{ width: 25, height: 25 }}
                  />
                  <Text style={[styles.textNormal, styles.grayC]}>Wind Speed</Text>
                </View>
                {weatherToday ? (
                  <Text style={[styles.textNormal, { fontWeight: 600 }]}>{weatherToday.wind.speed} m/s</Text>
                ) : (
                  <Text>Loading data...</Text>
                )}
              </View>

              {/* Pressure */}
              <View style={[{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }]}>
                <View style={[{ flexDirection: 'row', gap: 10 }]}>
                  <ExpoImage
                    source={require('../assets/images/air-pressure.png')}
                    style={{ width: 25, height: 25 }}
                  />
                  <Text style={[styles.textNormal, styles.grayC]}>Air Pressure</Text>
                </View>
                {weatherToday ? (
                  <Text style={[styles.textNormal, { fontWeight: 600 }]}>{weatherToday.main.pressure} hPa</Text>
                ) : (
                  <Text>Loading data...</Text>
                )}
              </View>

              {/* Visibility */}
              <View style={[{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }]}>
                <View style={[{ flexDirection: 'row', gap: 10 }]}>
                  <ExpoImage
                    source={require('../assets/images/visibility.png')}
                    style={{ width: 25, height: 25 }}
                  />
                  <Text style={[styles.textNormal, styles.grayC]}>Visibility</Text>
                </View>
                {weatherToday ? (
                  <Text style={[styles.textNormal, { fontWeight: 600 }]}>{weatherToday.visibility / 1000} km</Text>
                ) : (
                  <Text>Loading data...</Text>
                )}
              </View>
            </View>

            <View style={styles.footer}>
              <View style={{ flexDirection: 'row' }}>
                <ExpoImage
                  source={require('../assets/images/paper.png')}
                  style={{ width: 18, height: 18, marginEnd: 4 }}
                />
                <Text style={[styles.grayC, styles.boldStyle]}>From Openweathermap</Text>
              </View>
            </View>
          </ScrollView>
        </Animated.View>
      </ImageBackground>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: { position: 'relative', flex: 1, width: '96%', alignItems: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  jusBetween: { flexDirection: 'row', justifyContent: 'space-between' },
  p20: { padding: 20 },
  grayC: { color: 'gray' },
  textNormal: { fontSize: 16 },
  srollview: { width: '100%', marginEnd: -60 },
  titleStyle: { fontSize: 40, fontWeight: '300' },
  background: { flex: 1, width: '100%', height: '100%', resizeMode: 'stretch', justifyContent: 'center', alignItems: 'center' },
  grayText: { color: 'gray' },
  title: { justifyContent: 'center', alignItems: 'center', width: '90%', height: 180 },
  menubar: { flexDirection: "row", justifyContent: 'space-between', alignItems: 'center', height: 80, width: '100%', padding: 20 },
  weatherdetail: { width: '90%', height: 370, borderRadius: 20, backgroundColor: '#fff' },
  errorNotif: { height: 50, width: '70%', marginTop: 10, flexDirection: 'row', backgroundColor: 'orange', justifyContent: 'center', alignItems: 'center', borderRadius: 10 },
  subWeather: { flex: 1, justifyContent: 'center', alignItems: 'center', width: 80 },
  menu: { position: "absolute", left: -MENU_WIDTH, top: 30, width: MENU_WIDTH, height: "95%", backgroundColor: "white", borderTopRightRadius: 20, borderBottomRightRadius: 20, shadowColor: "#000", shadowOffset: { width: -3, height: 0 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 5 },
  menuContent: { width: '100%', height: '85%', marginTop: 10, paddingHorizontal: 30 },
  manageLocBtn: { marginTop: 20, backgroundColor: '#ddd', color: 'gray', width: '80%', height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  boldStyle: { fontWeight: 'bold' },
  timeButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ddd', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', borderRadius: 10, width: '80%', maxHeight: '50%', padding: 20 },
  hourList: { maxHeight: 200 },
  hourItem: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  hourText: { fontSize: 16, color: 'black' },
  closeButton: { marginTop: 10, backgroundColor: '#ddd', padding: 10, borderRadius: 5, alignItems: 'center' },
  closeButtonText: { fontSize: 16, color: 'black', fontWeight: '500' }
});

export default HomeScreen;