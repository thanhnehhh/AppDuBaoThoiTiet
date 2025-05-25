import { Image, StyleSheet, View, Text, ImageBackground, Dimensions, ScrollView, TouchableOpacity, Animated, FlatList, Switch, Modal, Platform } from 'react-native';
import AntDesign from '@expo/vector-icons/AntDesign';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect, useState, useRef } from 'react'; // Import useRef
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SimpleLineIcons } from '@expo/vector-icons';
import { useRouter } from "expo-router";
import { Image as ExpoImage } from 'expo-image';
import { useWeather } from '../context/weather_context';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

const temperCelsiusBlack = <MaterialCommunityIcons name="temperature-celsius" size={45} color="black" />;
const temperCelsiusBlackMedium = <MaterialCommunityIcons name="temperature-celsius" size={16} color="black" />;
const temperCelsiusGray = <MaterialCommunityIcons name="temperature-celsius" size={13} color="gray" />;
const temperCelsiusGrayMedium = <MaterialCommunityIcons name="temperature-celsius" size={16} color="gray" />;
const apiKey = 'bffd2370ad6ad9d6d5d7dc8088f85a8e'; // KHÓA API CỦA BẠN

const { width } = Dimensions.get('window');
const MENU_WIDTH = width * 0.93;

const HomeScreen = () => {
  const [translateX] = useState(new Animated.Value(0)); // Sử dụng Animated.Value
  const [isOpen, setIsOpen] = useState(false);
  const [weatherToday, setWeatherToday] = useState(null);
  const [forecastData, setForecastData] = useState([]);
  const [cityTimezone, setCityTimezone] = useState(0);
  // cities và favoriteCity được quản lý bởi context, không cần useState ở đây
  const { cities, setCities, favoriteCity, setFavoriteCity } = useWeather();
  const router = useRouter();
  const [otherCity, setOtherCity] = useState(new Map());
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notificationHour, setNotificationHour] = useState(6);
  const [showHourModal, setShowHourModal] = useState(false);
  const [locationErrorMsg, setLocationErrorMsg] = useState(null);
  const [showDailyForecastModal, setShowDailyForecastModal] = useState(false);
  const [selectedDayForecast, setSelectedDayForecast] = useState(null);

  // useRef để tránh re-render không cần thiết khi toggleMenu
  const menuAnimation = useRef(new Animated.Value(0)).current;

  const toggleMenu = () => {
    const toValue = isOpen ? 0 : MENU_WIDTH;
    Animated.timing(menuAnimation, {
      toValue,
      duration: 300,
      useNativeDriver: true,
    }).start();
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    translateX.setValue(menuAnimation); // Liên kết Animated.Value với state translateX
  }, [menuAnimation, translateX]);


  const toggleNotifications = async () => {
    const newState = !notificationsEnabled;
    setNotificationsEnabled(newState);
    await AsyncStorage.setItem('notifications_enabled', newState.toString());

    if (!newState) {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('Thông báo đã tắt');
    }
  };

  const handleHourChange = async (hour) => {
    setNotificationHour(hour);
    await AsyncStorage.setItem('notification_hour', hour.toString());
    setShowHourModal(false);
  };

  // MAIN EFFECT: Xử lý Location và Weather Data
  useEffect(() => {
    let isMounted = true; // Dùng để tránh cập nhật state trên unmounted component

    const DEFAULT_CITY = 'Ho Chi Minh City'; // Thành phố mặc định

    const getLocationAndWeather = async () => {
      console.log('getLocationAndWeather: Bắt đầu lấy vị trí...');
      let { status } = await Location.requestForegroundPermissionsAsync();
      console.log('getLocationAndWeather: Trạng thái quyền truy cập vị trí:', status);

      if (status !== 'granted') {
        setLocationErrorMsg('Không thể truy cập vị trí. Vui lòng cấp quyền trong cài đặt.');
        console.error('getLocationAndWeather: Quyền truy cập vị trí bị từ chối');
        if (isMounted) {
          // Chỉ thiết lập thành phố mặc định nếu cities chưa được thiết lập
          if (cities.length === 0 || cities[0] === 'Loading Location...') {
             setCities([DEFAULT_CITY]);
             console.log(`getLocationAndWeather: Fallback về ${DEFAULT_CITY} do quyền bị từ chối.`);
          }
        }
        return;
      }

      let location;
      try {
        location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        console.log('getLocationAndWeather: Tọa độ vị trí hiện tại:', location.coords.latitude, location.coords.longitude);
      } catch (err) {
        console.error('getLocationAndWeather: Lỗi khi lấy vị trí hiện tại:', err);
        setLocationErrorMsg('Không thể lấy vị trí hiện tại. Vui lòng kiểm tra GPS.');
        if (isMounted) {
          if (cities.length === 0 || cities[0] === 'Loading Location...') {
            setCities([DEFAULT_CITY]);
            console.log(`getLocationAndWeather: Fallback về ${DEFAULT_CITY} do lỗi GPS.`);
          }
        }
        return;
      }

      let geocodedAddress;
      try {
        geocodedAddress = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        console.log('getLocationAndWeather: Kết quả chuyển đổi địa lý ngược:', JSON.stringify(geocodedAddress));
      } catch (err) {
        console.error('getLocationAndWeather: Lỗi khi chuyển đổi địa lý ngược:', err);
        setLocationErrorMsg('Không thể xác định thành phố từ vị trí.');
        if (isMounted) {
          if (cities.length === 0 || cities[0] === 'Loading Location...') {
            setCities([DEFAULT_CITY]);
            console.log(`getLocationAndWeather: Fallback về ${DEFAULT_CITY} do lỗi xác định thành phố.`);
          }
        }
        return;
      }

      if (isMounted && geocodedAddress && geocodedAddress.length > 0) {
        const detectedCity = geocodedAddress[0].city || geocodedAddress[0].subregion || geocodedAddress[0].name;
        console.log('getLocationAndWeather: Thành phố được phát hiện:', detectedCity);
        if (detectedCity) {
          // Chỉ cập nhật nếu thành phố hiện tại không phải là thành phố được phát hiện
          if (cities.length === 0 || cities[0] !== detectedCity) {
            console.log('getLocationAndWeather: Đặt thành phố chính thành:', detectedCity);
            setCities([detectedCity, ...cities.filter(c => c !== detectedCity)]);
            setLocationErrorMsg(null); // Xóa lỗi nếu tìm thấy vị trí
          } else {
            console.log('getLocationAndWeather: Thành phố đã được đặt là:', detectedCity);
          }
        } else {
          console.warn('getLocationAndWeather: Không thể phát hiện tên thành phố từ dữ liệu vị trí.');
          setLocationErrorMsg('Không thể phát hiện tên thành phố từ vị trí của bạn.');
          if (isMounted) {
            if (cities.length === 0 || cities[0] === 'Loading Location...') {
              setCities([DEFAULT_CITY]);
              console.log(`getLocationAndWeather: Fallback về ${DEFAULT_CITY} do không tìm thấy tên thành phố.`);
            }
          }
        }
      } else if (isMounted) {
        console.warn('getLocationAndWeather: Kết quả chuyển đổi địa lý ngược trống.');
        setLocationErrorMsg('Không thể xác định thành phố từ vị trí của bạn.');
        if (cities.length === 0 || cities[0] === 'Loading Location...') {
          setCities([DEFAULT_CITY]);
          console.log(`getLocationAndWeather: Fallback về ${DEFAULT_CITY} do kết quả geocoding trống.`);
        }
      }
    };

    const fetchWeather = async (city) => {
      if (!city || typeof city !== 'string' || city === 'Loading Location...') {
        console.warn('fetchWeather: Bỏ qua lấy thời tiết cho thành phố không hợp lệ:', city);
        return;
      }
      console.log('fetchWeather: Đang lấy thời tiết cho thành phố:', city);
      const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&units=metric&appid=${apiKey}`;
      try {
        const response = await fetch(url);
        const data = await response.json();
        if (!response.ok) {
          console.error(`WorkspaceWeather: Lỗi API cho thành phố ${city}:`, data.message || 'Lỗi không xác định');
          setWeatherToday(null);
          setForecastData([]);
          return;
        }
        if (isMounted) {
          console.log('fetchWeather: Dữ liệu thời tiết cho', city, ':', data);
          setForecastData(data.list || []);
          setWeatherToday(data.list?.[0] || null);
          setCityTimezone(data.city?.timezone || 0);
        }
      } catch (err) {
        console.error('fetchWeather: Lỗi khi lấy dữ liệu thời tiết:', err);
        setWeatherToday(null);
        setForecastData([]);
      }
    };

    const fetchCity = async (city) => {
      if (!city || typeof city !== 'string' || city === 'Loading Location...') {
        console.warn('fetchCity: Bỏ qua lấy thông tin thành phố cho thành phố không hợp lệ:', city);
        return;
      }
      console.log('fetchCity: Đang lấy thông tin thành phố cho:', city);
      const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&units=metric&appid=${apiKey}`;
      try {
        const response = await fetch(url);
        const data = await response.json();
        if (!response.ok) {
          console.error(`WorkspaceCity: Lỗi API khi lấy dữ liệu thành phố ${city}:`, data.message || 'Lỗi không xác định');
          setOtherCity(prev => {
            const newMap = new Map(prev);
            newMap.delete(city); // Xóa thành phố lỗi khỏi map
            return newMap;
          });
          return;
        }
        if (isMounted) {
          console.log('fetchCity: Dữ liệu thành phố khác cho', city, ':', data);
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
        console.error('fetchCity: Lỗi khi lấy dữ liệu thời tiết cho thành phố khác:', err);
        setOtherCity(prev => {
          const newMap = new Map(prev);
          newMap.delete(city); // Xóa thành phố lỗi khỏi map
          return newMap;
        });
      }
    };

    // Logic chính để quyết định khi nào gọi getLocationAndWeather và fetch data
    if (cities.length === 0 || cities[0] === 'Loading Location...') {
      // Nếu cities rỗng hoặc đang ở trạng thái loading, cố gắng lấy vị trí hiện tại
      console.log('useEffect (main): Cities trống hoặc đang tải, gọi getLocationAndWeather.');
      getLocationAndWeather();
    } else {
      // Nếu cities đã có dữ liệu (từ AsyncStorage hoặc đã được thiết lập), fetch thời tiết
      console.log('useEffect (main): Cities đã có dữ liệu, bắt đầu fetch thời tiết.');
      fetchWeather(cities[0]);
      // Fetch data cho các thành phố khác
      cities.forEach(city => {
        if (city !== cities[0]) {
          fetchCity(city);
        }
      });
    }

    return () => {
      isMounted = false; // Cleanup function
    };
  }, [cities]); // Chạy lại khi cities thay đổi

  // EFFECT cho Notifications (chạy riêng)
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

      const savedEnabled = await AsyncStorage.getItem('notifications_enabled');
      const savedHour = await AsyncStorage.getItem('notification_hour');
      if (savedEnabled !== null) {
        setNotificationsEnabled(savedEnabled === 'true');
      }
      if (savedHour !== null) {
        setNotificationHour(parseInt(savedHour, 10));
      }

      // Không cần lưu default_city vào AsyncStorage từ đây nữa, WeatherProvider đã lo
      // if (cities.length > 0) {
      //   await AsyncStorage.setItem('default_city', cities[0]);
      // }

      await Notifications.cancelAllScheduledNotificationsAsync();

      if (notificationsEnabled && cities.length > 0 && cities[0] !== 'Loading Location...') {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "\uD83C\uDF24\uFE0F Chào buổi sáng!",
            body: `Kiểm tra thời tiết hôm nay tại ${cities[0] || 'thành phố của bạn'}`,
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
          },
          trigger: {
            hour: notificationHour,
            minute: 0,
            repeats: true,
          },
        });
        console.log(`Đã lên lịch thông báo thời tiết hàng ngày lúc ${notificationHour}:00 cho ${cities[0]}`);
      } else {
        console.log('Không thể lên lịch thông báo: notificationsEnabled là false hoặc cities chưa sẵn sàng.');
      }
    };

    setupNotifications();
  }, [cities, notificationsEnabled, notificationHour]); // Phụ thuộc vào cities để lấy tên thành phố cho thông báo

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
    if (!cityTimezone) return 'Đang tải...';
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

    const localOffset = new Date().getTimezoneOffset() * 60 * 1000;
    const now = Date.now();
    const cityCurrentTime = now + localOffset + cityTimezone * 1000;
    const predictTimeEnd = cityCurrentTime + 48 * 60 * 60 * 1000; // 48 giờ sau thời gian hiện tại của thành phố

    // Lọc các bản ghi trong 48 giờ tới, bắt đầu từ thời điểm hiện tại của thành phố
    return forecastData.filter(item => {
      const forecastTime = item.dt * 1000 + localOffset + cityTimezone * 1000;
      return forecastTime >= cityCurrentTime && forecastTime <= predictTimeEnd;
    });
  };


  const getWeeklyForecast = () => {
    if (!cityTimezone || !forecastData.length) return [];

    const localOffset = new Date().getTimezoneOffset() * 60 * 1000;
    const groupedByDay = {};
    const now = Date.now();
    const cityCurrentDate = new Date(now + localOffset + cityTimezone * 1000);
    cityCurrentDate.setHours(0, 0, 0, 0); // Đặt về đầu ngày hiện tại của thành phố

    forecastData.forEach(item => {
      const forecastTime = new Date(item.dt * 1000 + localOffset + cityTimezone * 1000);
      forecastTime.setHours(0, 0, 0, 0); // Đặt về đầu ngày của dự báo

      // Chỉ lấy các ngày từ ngày hiện tại trở đi (bao gồm ngày hiện tại)
      if (forecastTime.getTime() >= cityCurrentDate.getTime()) {
        const dayKey = forecastTime.toLocaleDateString('en-US', { year: 'numeric', month: 'numeric', day: 'numeric' });

        if (!groupedByDay[dayKey]) {
          groupedByDay[dayKey] = {
            day: forecastTime.toLocaleDateString('en-US', { weekday: 'short' }),
            date: forecastTime.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
            minTemp: item.main.temp,
            maxTemp: item.main.temp,
            // Chọn icon đại diện cho ngày (ví dụ: lấy icon của buổi trưa hoặc icon phổ biến nhất)
            // Tạm thời lấy icon của mục đầu tiên trong ngày, có thể cải thiện logic này
            icon: item.weather[0].icon,
            hourlyData: [], // Lưu trữ dữ liệu từng giờ cho modal chi tiết
          };
        }

        groupedByDay[dayKey].minTemp = Math.min(groupedByDay[dayKey].minTemp, item.main.temp_min);
        groupedByDay[dayKey].maxTemp = Math.max(groupedByDay[dayKey].maxTemp, item.main.temp_max);
        groupedByDay[dayKey].hourlyData.push(item);
      }
    });

    // Sắp xếp các ngày và chỉ lấy 5 ngày tiếp theo
    const sortedDays = Object.keys(groupedByDay).sort((a, b) => new Date(a) - new Date(b));

    return sortedDays.slice(0, 5).map(key => {
      // Logic để chọn icon đại diện cho cả ngày (ví dụ: icon phổ biến nhất hoặc icon buổi trưa)
      // Hiện tại đang lấy icon của item đầu tiên trong ngày đó, bạn có thể tự cải thiện
      const dayData = groupedByDay[key];
      // Có thể thêm logic để chọn icon "phổ biến nhất" hoặc "quan trọng nhất" trong ngày
      // Ví dụ: const commonIcon = findMostCommonIcon(dayData.hourlyData);
      return { ...dayData, /* icon: commonIcon */ };
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
        <Animated.View style={[styles.menu, { transform: [{ translateX: menuAnimation }] }]}>
          <View style={[{ flexDirection: 'row', justifyContent: 'space-between' }]}>
            <TouchableOpacity onPress={toggleMenu} style={[styles.p20]}>
              <AntDesign name="close" size={30} color="black" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/CityManagement")} style={[styles.p20]}>
              <AntDesign name="setting" size={30} color="black" />
            </TouchableOpacity>
          </View>

          <ScrollView style={[styles.menuContent]}>
            {locationErrorMsg && (
                <View style={styles.errorNotif}>
                    <Text style={{ color: 'white', fontSize: 13, textAlign: 'center' }}>{locationErrorMsg}</Text>
                </View>
            )}

            <View style={[styles.center, styles.jusBetween, { height: 40 }]}>
              <View style={[styles.center, { flexDirection: 'row' }]}>
                <AntDesign name="star" size={24} color="blue" />
                <Text style={[{ paddingStart: 10, fontWeight: '600', fontSize: 17 }, styles.grayC]}>
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
                      <Text style={[{ paddingStart: 10, fontWeight: '600', fontSize: 17 }, styles.grayC]}>
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
                <Text style={[{ paddingStart: 10, fontWeight: '600', fontSize: 17 }, styles.grayC]}>
                  Other locations
                </Text>
              </View>
            </View>

            {cities.filter(city => !favoriteCity.includes(city) && city !== 'Loading Location...').map(city => {
              const info = otherCity.get(city);
              return (
                <View key={city} style={[styles.center, styles.jusBetween, { height: 50, paddingStart: 20 }]}>
                  <View style={[styles.center, { flexDirection: 'row' }]}>
                    <TouchableOpacity onPress={() => setIndex(city)}>
                      <Text style={[{ paddingStart: 10, fontSize: 17, fontWeight: '400', color: 'black' }]}>
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
                <Text style={{ fontSize: 18, fontWeight: '500', color: 'gray' }}>Location management</Text>
              </TouchableOpacity>
            </View>

            <View style={{ height: 1, width: '100%', backgroundColor: 'black', marginTop: 30, marginBottom: 30 }}></View>

            <View style={[styles.center, styles.jusBetween, { height: 40, marginBottom: 15 }]}>
              <View style={[styles.center, { flexDirection: 'row' }]}>
                <AntDesign name="notification" size={22} color="gray" />
                <Text style={[{ paddingStart: 20, fontWeight: '400', fontSize: 20 }]}>Notification Settings</Text>
              </View>
            </View>

            <View style={[styles.center, styles.jusBetween, { height: 40, marginBottom: 15, paddingStart: 20 }]}>
              <Text style={[{ fontSize: 17, fontWeight: '400', color: 'black' }]}>Enable Notifications</Text>
              <Switch
                value={notificationsEnabled}
                onValueChange={toggleNotifications}
                trackColor={{ false: '#767577', true: '#81b0ff' }}
                thumbColor={notificationsEnabled ? '#f4f3f4' : '#f4f3f4'}
              />
            </View>

            <View style={[styles.center, styles.jusBetween, { height: 40, marginBottom: 15, paddingStart: 20 }]}>
              <Text style={[{ fontSize: 17, fontWeight: '400', color: 'black' }]}>Notification Time</Text>
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
                <Text style={[{ paddingStart: 20, fontWeight: '400', fontSize: 20 }]}>Liên hệ chúng tôi</Text>
              </View>
            </View>

            <View style={[styles.center, styles.jusBetween, { height: 40, marginBottom: 15 }]}>
              <View style={[styles.center, { flexDirection: 'row' }]}>
                <AntDesign name="questioncircle" size={22} color="gray" />
                <Text style={[{ paddingStart: 20, fontWeight: '400', fontSize: 20 }]}>Cách sử dụng</Text>
              </View>
            </View>
          </ScrollView>
        </Animated.View>

        {/* Main Weather Display */}
        <Animated.View style={[styles.container, { transform: [{ translateX: menuAnimation }] }]}>
          <View style={styles.menubar}>
            <TouchableOpacity onPress={toggleMenu}>
              <MaterialIcons name="menu" size={30} color="black" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/CityResearch")}>
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
                {/* Hiển thị thành phố chính từ context */}
                <Text style={{ fontSize: 30 }}>{cities.length > 0 && cities[0] !== 'Loading Location...' ? cities[0] : 'Đang tải vị trí...'}</Text>
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
                    <Text>Đang tải...</Text>
                  )}
                </View>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'flex-end', marginRight: 20 }}>
                  {weatherToday ? (
                    <>
                      <Text style={styles.grayC}>{weatherToday.weather[0].description}</Text>
                      <Text style={styles.grayC}>
                        {weatherToday.main.temp_min}{temperCelsiusGray}/{weatherToday.main.temp_max}{temperCelsiusGray}
                      </Text>
                      <Text style={styles.grayC}>Cảm giác như: {weatherToday.main.feels_like}{temperCelsiusGray}</Text>
                    </>
                  ) : (
                    <Text>Đang tải...</Text>
                  )}
                </View>
              </View>
              <View style={{ width: '100%', alignItems: 'center', flex: 1 }}>
                <Text style={[styles.textNormal, { marginLeft: 20, marginTop: 20, fontWeight: '600' }]}>Dự báo 2 ngày</Text>
                <View style={{ width: '94%', flexDirection: 'row', marginTop: 10, marginBottom: 20 }}>
                  <FlatList
                    data={getPredict2DaysForecast()}
                    keyExtractor={(item, index) => item.dt.toString() + index.toString()}
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
                <Text style={[styles.textNormal, { marginLeft: 20, marginTop: 20, fontWeight: '600' }]}>Dự báo hàng tuần</Text>
                <View style={{ width: '94%', flexDirection: 'row', marginTop: 10, marginBottom: 20 }}>
                  <FlatList
                    data={getWeeklyForecast()}
                    keyExtractor={(item, index) => item.date + index.toString()}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.weeklyForecastItem}
                        onPress={() => {
                          setSelectedDayForecast(item);
                          setShowDailyForecastModal(true);
                        }}
                      >
                        <Text style={styles.weeklyDayText}>{item.day}</Text>
                        <Text style={styles.weeklyDateText}>{item.date}</Text>
                        <ExpoImage
                          source={item?.icon ? { uri: iconWeather(item.icon) } : require('../assets/images/cloudy.png')}
                          style={styles.weeklyIcon}
                        />
                        <Text style={styles.weeklyTempText}>
                          {Math.round(item.maxTemp)}° / {Math.round(item.minTemp)}°
                        </Text>
                      </TouchableOpacity>
                    )}
                    horizontal={true}
                    showsHorizontalScrollIndicator={false}
                  />
                </View>
              </View>
            </View>

            <View style={{ height: 1, backgroundColor: 'gray', width: '90%', marginTop: 20, marginBottom: 20 }}></View>

            {/* Weather Metrics */}
            <View style={[{ padding: 10, width: '90%' }]}>
              <View style={[{ flexDirection: 'row', justifyContent: 'space-between' }]}>
                <View style={[{ flexDirection: 'row', gap: 10 }]}>
                  <ExpoImage
                    source={require('../assets/images/humidity.png')}
                    style={{ width: 25, height: 25 }}
                  />
                  <Text style={[styles.textNormal, styles.grayC]}>Độ ẩm</Text>
                </View>
                {weatherToday ? (
                  <Text style={[styles.textNormal, { fontWeight: '600' }]}>{weatherToday.main.humidity}%</Text>
                ) : (
                  <Text>Đang tải dữ liệu...</Text>
                )}
              </View>

              <View style={[{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 }]}>
                <View style={[{ flexDirection: 'row', gap: 10 }]}>
                  <ExpoImage
                    source={require('../assets/images/wind.png')}
                    style={{ width: 25, height: 25 }}
                  />
                  <Text style={[styles.textNormal, styles.grayC]}>Tốc độ gió</Text>
                </View>
                {weatherToday ? (
                  <Text style={[styles.textNormal, { fontWeight: '600' }]}>{weatherToday.wind.speed} m/s</Text>
                ) : (
                  <Text>Đang tải dữ liệu...</Text>
                )}
              </View>

              <View style={[{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }]}>
                <View style={[{ flexDirection: 'row', gap: 10 }]}>
                  <ExpoImage
                    source={require('../assets/images/air-pressure.png')}
                    style={{ width: 25, height: 25 }}
                  />
                  <Text style={[styles.textNormal, styles.grayC]}>Áp suất không khí</Text>
                </View>
                {weatherToday ? (
                  <Text style={[styles.textNormal, { fontWeight: '600' }]}>{weatherToday.main.pressure} hPa</Text>
                ) : (
                  <Text>Đang tải dữ liệu...</Text>
                )}
              </View>

              <View style={[{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }]}>
                <View style={[{ flexDirection: 'row', gap: 10 }]}>
                  <ExpoImage
                    source={require('../assets/images/visibility.png')}
                    style={{ width: 25, height: 25 }}
                  />
                  <Text style={[styles.textNormal, styles.grayC]}>Tầm nhìn</Text>
                </View>
                {weatherToday ? (
                  <Text style={[styles.textNormal, { fontWeight: '600' }]}>{weatherToday.visibility / 1000} km</Text>
                ) : (
                  <Text>Đang tải dữ liệu...</Text>
                )}
              </View>
            </View>

            <View style={styles.footer}>
              <View style={{ flexDirection: 'row' }}>
                <ExpoImage
                  source={require('../assets/images/paper.png')}
                  style={{ width: 18, height: 18, marginEnd: 4 }}
                />
                <Text style={[styles.grayC, styles.boldStyle]}>Từ Openweathermap</Text>
              </View>
            </View>
          </ScrollView>
        </Animated.View>

        {/* Modal chi tiết dự báo theo ngày */}
        <Modal
          visible={showDailyForecastModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowDailyForecastModal(false)}
        >
          <View style={styles.dailyForecastModalOverlay}>
            <View style={styles.dailyForecastModalContent}>
              <View style={styles.dailyForecastModalHeader}>
                <Text style={styles.dailyForecastModalTitle}>
                  Dự báo chi tiết cho {selectedDayForecast?.day}, {selectedDayForecast?.date}
                </Text>
                <TouchableOpacity onPress={() => setShowDailyForecastModal(false)}>
                  <AntDesign name="close" size={24} color="black" />
                </TouchableOpacity>
              </View>

              <FlatList
                data={selectedDayForecast?.hourlyData}
                keyExtractor={(item, index) => item.dt.toString() + index.toString()}
                renderItem={({ item }) => (
                  <View style={styles.hourlyItem}>
                    <Text style={styles.hourlyTime}>{formatTime(item.dt)}</Text>
                    <ExpoImage
                      source={item?.weather?.[0]?.icon ? { uri: iconWeather(item.weather[0].icon) } : require('../assets/images/cloudy.png')}
                      style={styles.hourlyIcon}
                    />
                    <Text style={styles.hourlyTemp}>{Math.round(item.main.temp)}{temperCelsiusBlackMedium}</Text>
                    <View style={styles.hourlyDetails}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Image source={require('../assets/images/water_drop.png')} style={styles.detailIcon} />
                        <Text style={styles.detailText}>{item.main.humidity}%</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Image source={require('../assets/images/wind.png')} style={styles.detailIcon} />
                        <Text style={styles.detailText}>{item.wind.speed} m/s</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Image source={require('../assets/images/visibility.png')} style={styles.detailIcon} />
                        <Text style={styles.detailText}>{item.visibility / 1000} km</Text>
                      </View>
                    </View>
                  </View>
                )}
                contentContainerStyle={styles.hourlyListContent}
              />
            </View>
          </View>
        </Modal>
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
  grayText: {
    color: 'gray'
  },
  title: { justifyContent: 'center', alignItems: 'center', width: '90%', height: 180 },
  menubar: { flexDirection: "row", justifyContent: 'space-between', alignItems: 'center', height: 80, width: '100%', padding: 20 },
  weatherdetail: { width: '90%', borderRadius: 20, backgroundColor: '#fff' },
  errorNotif: {
    height: 50,
    width: '90%',
    marginTop: 10,
    flexDirection: 'row',
    backgroundColor: '#dc3545',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 10,
    alignSelf: 'center'
  },
  subWeather: { flex: 1, justifyContent: 'center', alignItems: 'center', width: 80 },
  menu: { position: "absolute", left: -MENU_WIDTH, top: 30, width: MENU_WIDTH, height: "95%", backgroundColor: "white", borderTopRightRadius: 20, borderBottomRightRadius: 20, shadowColor: "#000", shadowOffset: { width: -3, height: 0 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 5, padding: 20 },
  menuContent: { width: '100%', height: '85%', marginTop: 10, paddingHorizontal: 30 },
  manageLocBtn: { marginTop: 20, backgroundColor: '#ddd', color: 'gray', width: '90%', height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  boldStyle: { fontWeight: 'bold' },
  timeButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ddd', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', borderRadius: 10, width: '80%', maxHeight: '50%', padding: 20 },
  hourList: { maxHeight: 200 },
  hourItem: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  hourText: { fontSize: 16, color: 'black' },
  closeButton: { marginTop: 10, backgroundColor: '#ddd', padding: 10, borderRadius: 5, alignItems: 'center' },
  closeButtonText: { fontSize: 16, color: 'black', fontWeight: '500' },
  // Style cho dự báo hàng tuần
  weeklyForecastItem: {
    width: 90,
    height: 120,
    backgroundColor: '#f5f5f5',
    borderRadius: 15,
    marginHorizontal: 5,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  weeklyDayText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  weeklyDateText: {
    fontSize: 12,
    color: 'gray',
  },
  weeklyIcon: {
    width: 35,
    height: 35,
    marginVertical: 5,
  },
  weeklyTempText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'black',
  },

  // Style cho Modal chi tiết dự báo theo ngày
  dailyForecastModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dailyForecastModalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    padding: 20,
  },
  dailyForecastModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10,
  },
  dailyForecastModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'black',
  },
  hourlyListContent: {
    paddingBottom: 10,
  },
  hourlyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  hourlyTime: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    width: 60,
  },
  hourlyIcon: {
    width: 30,
    height: 30,
  },
  hourlyTemp: {
    fontSize: 16,
    fontWeight: '600',
    color: 'black',
  },
  hourlyDetails: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    flex: 1,
  },
  detailIcon: {
    width: 15,
    height: 15,
    marginRight: 3,
  },
  detailText: {
    fontSize: 12,
    color: 'gray',
  },
});

export default HomeScreen;