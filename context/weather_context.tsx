import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type WeatherContextType = {
  cities: string[];
  setCities: React.Dispatch<React.SetStateAction<string[]>>;
  favoriteCity: string[];
  setFavoriteCity: React.Dispatch<React.SetStateAction<string[]>>;
  isLoading: boolean;
};

const WeatherContext = createContext<WeatherContextType>({
  cities: [],
  setCities: () => {
    throw new Error('setCities must be used within a WeatherProvider');
  },
  favoriteCity: [],
  setFavoriteCity: () => {
    throw new Error('setFavoriteCity must be used within a WeatherProvider');
  },
  isLoading: true,
});

export const WeatherProvider = ({ children }: { children: ReactNode }) => {
  const [cities, setCities] = useState<string[]>(['Ho Chi Minh']);
  const [favoriteCity, setFavoriteCity] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const savedCities = await AsyncStorage.getItem('cities');
        if (savedCities) {
          setCities(JSON.parse(savedCities));
        }
        const savedFavorites = await AsyncStorage.getItem('favoriteCities');
        if (savedFavorites) {
          setFavoriteCity(JSON.parse(savedFavorites));
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const saveData = async () => {
      try {
        await AsyncStorage.setItem('cities', JSON.stringify(cities));
        await AsyncStorage.setItem('favoriteCities', JSON.stringify(favoriteCity));
      } catch (error) {
        console.error('Error saving data:', error);
      }
    };
    if (!isLoading) {
      saveData();
    }
  }, [cities, favoriteCity, isLoading]);

  return (
    <WeatherContext.Provider value={{ cities, setCities, favoriteCity, setFavoriteCity, isLoading }}>
      {children}
    </WeatherContext.Provider>
  );
};

export const useWeather = () => useContext(WeatherContext);