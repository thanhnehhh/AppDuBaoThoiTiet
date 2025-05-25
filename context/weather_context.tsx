import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Định nghĩa kiểu cho Context
type WeatherContextType = {
  cities: string[];
  setCities: React.Dispatch<React.SetStateAction<string[]>>;
  favoriteCity: string[];
  setFavoriteCity: React.Dispatch<React.SetStateAction<string[]>>;
};

// Tạo Context với giá trị mặc định
const WeatherContext = createContext<WeatherContextType>({
  cities: [],
  setCities: () => {
    throw new Error('setCities must be used within a WeatherProvider');
  },
  favoriteCity: [],
  setFavoriteCity: () => {
    throw new Error('setFavoriteCity must be used within a WeatherProvider');
  },
});

export const WeatherProvider = ({ children }: { children: ReactNode }) => {
  // Khởi tạo cities với giá trị 'Loading Location...' để HomeScreen biết cần tải vị trí
  // Đây là điểm khởi đầu mới để đảm bảo logic lấy vị trí được chạy
  const [cities, setCities] = useState<string[]>(['Loading Location...']);
  const [favoriteCity, setFavoriteCity] = useState<string[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const savedCities = await AsyncStorage.getItem('cities');
        let initialCities: string[] = [];

        if (savedCities) {
          try {
            initialCities = JSON.parse(savedCities);
            // Đảm bảo initialCities là một mảng và không rỗng sau khi parse
            if (!Array.isArray(initialCities) || initialCities.length === 0) {
              initialCities = ['Loading Location...']; // Nếu parse ra mảng rỗng, vẫn cần load vị trí
            }
          } catch (parseError) {
            console.error('Error parsing saved cities:', parseError);
            initialCities = ['Loading Location...']; // Nếu lỗi parse, cũng cần load vị trí
          }
        } else {
          // Nếu chưa có cities nào được lưu, đặt 'Loading Location...'
          initialCities = ['Loading Location...'];
        }

        setCities(initialCities);

        const savedFavorites = await AsyncStorage.getItem('favorite_city'); // Key này cần khớp với key trong HomeScreen
        if (savedFavorites) {
          try {
            const parsedFavorites: string[] = JSON.parse(savedFavorites);
            if (Array.isArray(parsedFavorites)) {
              setFavoriteCity(parsedFavorites);
            } else {
              setFavoriteCity([]); // Đảm bảo là mảng
            }
          } catch (parseError) {
            console.error('Error parsing saved favorite cities:', parseError);
            setFavoriteCity([]);
          }
        } else {
          setFavoriteCity([]);
        }

      } catch (error) {
        console.error('Error loading data from AsyncStorage:', error);
        // Fallback an toàn nếu có lỗi nghiêm trọng khi tải AsyncStorage
        setCities(['Ho Chi Minh City']); // Đặt mặc định nếu có lỗi tải
        setFavoriteCity([]);
      }
    };

    loadData();
  }, []); // Chỉ chạy một lần khi component mount

  useEffect(() => {
    const saveData = async () => {
      try {
        // Chỉ lưu khi cities không phải là giá trị tạm thời 'Loading Location...'
        // và đảm bảo nó không rỗng để tránh ghi đè lên các giá trị hợp lệ với mảng rỗng
        if (cities.length > 0 && cities[0] !== 'Loading Location...') {
          await AsyncStorage.setItem('cities', JSON.stringify(cities));
        }
        // Luôn lưu favoriteCity
        await AsyncStorage.setItem('favorite_city', JSON.stringify(favoriteCity)); // Đổi key ở đây để khớp
      } catch (error) {
        console.error('Error saving data to AsyncStorage:', error);
      }
    };

    // Gọi saveData khi cities hoặc favoriteCity thay đổi.
    // Logic `if (cities.length > 0 && cities[0] !== 'Loading Location...')`
    // đã đảm bảo việc lưu chỉ diễn ra khi có dữ liệu hợp lệ.
    saveData();
  }, [cities, favoriteCity]); // Phụ thuộc vào cities và favoriteCity

  return (
    <WeatherContext.Provider value={{ cities, setCities, favoriteCity, setFavoriteCity }}>
      {children}
    </WeatherContext.Provider>
  );
};

export const useWeather = () => {
  const context = useContext(WeatherContext);
  if (!context) {
    throw new Error('useWeather must be used within a WeatherProvider');
  }
  return context;
};