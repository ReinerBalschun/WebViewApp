// old Code
/*
import React, { useState, useEffect } from 'react';
import { SafeAreaView, StyleSheet, Text, View, Button, TextInput, ActivityIndicator, Alert, Image, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebView } from 'react-native-webview';
import init from 'sp-react-native-mqtt';
import { Buffer } from 'buffer';

declare var Paho: {
  MQTT: {
    Client: new (host: string, port: number, clientId: string) => any;
    Message: new (payload: string) => any;
  }
};

// Add type declaration for init
declare module 'sp-react-native-mqtt' {
  export default function init(config: {
    size: number;
    storageBackend: any;
    defaultExpires: number;
    enableCache: boolean;
    sync: object;
  }): void;
}

init({
  size: 10000,
  storageBackend: AsyncStorage,
  defaultExpires: 1000 * 3600 * 24,
  enableCache: true,
  sync: {},
});

const App: React.FC = () => {
  const [showSplashScreen, setShowSplashScreen] = useState(true);
  const [ipAddress, setIpAddress] = useState<string>('');
  const [url, setUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [pingMessage, setPingMessage] = useState<string>('');
  const [counter, setCounter] = useState(0);
  const [mqttClient, setMqttClient] = useState<any>(null);

  // Funktion zum Speichern der IP-Adresse im lokalen Speicher
  const saveIpAddress = async (ip: string) => {
    try {
      await AsyncStorage.setItem('savedIp', ip);
    } catch (error) {
      console.error('Fehler beim Speichern der IP-Adresse', error);
    }
  };

  // Funktion zum Laden der gespeicherten IP-Adresse
  const loadSavedIp = async () => {
    try {
      const savedIp = await AsyncStorage.getItem('savedIp');
      if (savedIp) {
        return savedIp;
      }
      return null;
    } catch (error) {
      console.error('Fehler beim Laden der gespeicherten IP-Adresse', error);
      return null;
    }
  };

  // Funktion zum Validieren der eingegebenen IPv4-Adresse
  const validateIpAddress = (ip: string) => {
    const ipv4Regex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipv4Regex.test(ip);
  };

  // Funktion zum Pingen der URL mit Timeout
  const pingUrl = async (url: string, timeout = 5000) => {
    // Timeout-Promise
    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), timeout)
    );

    try {
      const fetchPromise = fetch(url, { method: 'HEAD' }); // HEAD-Anfrage zum Überprüfen der Verbindung
      const response = await Promise.race([fetchPromise, timeoutPromise]); // Rennen zwischen Fetch und Timeout

      if (response && (response as Response).ok) {
        return true; // Ping erfolgreich
      } else {
        return false; // Ping fehlgeschlagen oder Timeout
      }
    } catch (error) {
      return false; // Fehler beim Pingen (z.B. Netzwerkproblem)
    }
  };

  // App beim Start: Prüfe, ob eine IP gespeichert ist, und frage den Benutzer, ob er diese verwenden möchte
  useEffect(() => {
    const checkPreviousIp = async () => {
      const savedIp = await loadSavedIp();
      if (savedIp) {
        Alert.alert(
          'Gespeicherte IP gefunden',
          `Möchtest du die gespeicherte IP (${savedIp}) verwenden?`,
          [
            {
              text: 'Neue IP eingeben',
              onPress: () => setIsLoading(false),
              style: 'cancel',
            },
            {
              text: 'Gespeicherte IP verwenden',
              onPress: async () => {
                const fullUrl = `http://${savedIp}:3000/public-dashboards/2dc727942b8b4f01be0deb0e0b415aec?orgId=1&refresh=5s`;
                setIsLoading(true); // Ladebildschirm anzeigen
                setPingMessage('Versuche gespeicherte IP zu pingen...');

                const pingSuccess = await pingUrl(fullUrl);
                if (pingSuccess) {
                  setPingMessage('Ping war erfolgreich. Neustart...');
                  setTimeout(() => {
                    setUrl(fullUrl); // Setze die URL für den WebView
                    setIsLoading(false); // Ladebildschirm ausblenden
                  }, 1000);
                } else {
                  setIsLoading(false); // Ladebildschirm ausblenden
                  Alert.alert('Ping fehlgeschlagen', 'Bitte gib eine neue IP-Adresse ein.');
                }
              },
            },
          ]
        );
      }
    };

    checkPreviousIp();

    const splashTimeout = setTimeout(() => {
      setShowSplashScreen(false);
    }, 3000);

    return () => clearTimeout(splashTimeout);
  }, []);

  useEffect(() => {
    const client = new Paho.MQTT.Client(
      '192.168.178.40',
      1883,
      `client-${Math.random().toString(16).substr(2, 8)}`
    );

    client.connect({
      onSuccess: () => {
        console.log('Connected to MQTT broker');
      },
      useSSL: false,
      onFailure: (e: Error) => console.log('Failed to connect:', e)
    });

    setMqttClient(client);

    return () => {
      if (client) {
        client.disconnect();
      }
    };
  }, []);

  const handleMqttPress = () => {
    if (mqttClient && mqttClient.isConnected()) {
      const newCount = counter + 1;
      setCounter(newCount);
      const message = new Paho.MQTT.Message(`Test ${newCount}`);
      message.destinationName = 'Test';
      mqttClient.send(message);
    }
  };

  const handleSetUrl = async () => {
    if (validateIpAddress(ipAddress)) {
      setIsLoading(true); // Ladebildschirm anzeigen
      const fullUrl = `http://${ipAddress}:3000/public-dashboards/2dc727942b8b4f01be0deb0e0b415aec?orgId=1&refresh=5s`;
      setPingMessage('Versuche, die IP mit der URL zu pingen...');

      const pingSuccess = await pingUrl(fullUrl, 5000); // 5 Sekunden Timeout
      if (pingSuccess) {
        setPingMessage('Ping war erfolgreich. Verbindung wird aufgebaut...');
        await saveIpAddress(ipAddress); // Speichere die IP-Adresse

        setTimeout(() => {
          setUrl(fullUrl); // Setze die URL für den WebView
          setIsLoading(false); // Ladebildschirm ausblenden
        }, 1000);
      } else {
        setIsLoading(false); // Ladebildschirm ausblenden
        Alert.alert('Ping fehlgeschlagen', 'Bitte gib eine andere IP-Adresse ein.');
      }
    } else {
      Alert.alert('Ungültige IP-Adresse', 'Bitte gib eine gültige IPv4-Adresse ein.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {showSplashScreen ? (
        // Splash Screen anzeigen
        <View style={styles.splashScreen}>
          <Image 
            source={require('./assets/Reiners Grafana Dashboard Splashscreen.webp')} // Pfad zu deinem Logo anpassen
            style={styles.logo} 
            resizeMode="contain" 
          />
        </View>
      ) : (
        <>
          {isLoading ? (
            // Ladebildschirm anzeigen
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FFFFFF" />
              <Text style={styles.loadingText}>{pingMessage}</Text>
            </View>
          ) : url ? (
            <View style={styles.container}>
              <WebView source={{ uri: url }} style={styles.webview} />
              <TouchableOpacity 
                style={styles.mqttButton}
                onPress={handleMqttPress}
              >
                <Text style={styles.buttonText}>Send MQTT</Text>
              </TouchableOpacity>
            </View>
          ) : (
            // Zeige IP-Eingabemaske, wenn keine URL vorhanden ist oder Ping fehlgeschlagen ist
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Bitte gib die IPv4-Adresse des Servers ein:</Text>
              <TextInput
                style={styles.input}
                placeholder="z.B. 192.168.0.40"
                placeholderTextColor="#888"
                keyboardType="numeric"
                value={ipAddress}
                onChangeText={setIpAddress}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Button title="Bestätigen" onPress={handleSetUrl} />
            </View>
          )}
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#212121',
  },
  webview: {
    flex: 1,
  },
  inputContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  label: {
    fontSize: 18,
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  input: {
    width: '80%',
    padding: 10,
    borderColor: '#757575',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 20,
    backgroundColor: '#424242',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#212121',
  },
  loadingText: {
    fontSize: 18,
    color: '#fff',
    marginTop: 10,
  },
  splashScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#212121',
  },
  logo: {
    width: 200,
    height: 200,
  },
  mqttButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    zIndex: 1000,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
  }
});

export default App;


*/


// neuer Code Stand 21.01.2025

/* import React, { useState, useEffect } from 'react';
import { SafeAreaView, StyleSheet, Text, View, Button, TextInput, ActivityIndicator, Alert, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebView } from 'react-native-webview';

const App: React.FC = () => {
  const [showSplashScreen, setShowSplashScreen] = useState(true);
  const [ipAddress, setIpAddress] = useState<string>('');
  const [url, setUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [pingMessage, setPingMessage] = useState<string>('');

  const saveIpAddress = async (ip: string) => {
    try {
      await AsyncStorage.setItem('savedIp', ip);
    } catch (error) {
      console.error('Fehler beim Speichern der IP-Adresse', error);
    }
  };

  const loadSavedIp = async () => {
    try {
      const savedIp = await AsyncStorage.getItem('savedIp');
      if (savedIp) {
        return savedIp;
      }
      return null;
    } catch (error) {
      console.error('Fehler beim Laden der gespeicherten IP-Adresse', error);
      return null;
    }
  };

  const validateIpAddress = (ip: string) => {
    const ipv4Regex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipv4Regex.test(ip);
  };

  const pingUrl = async (url: string, timeout = 5000) => {
    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), timeout)
    );

    try {
      const fetchPromise = fetch(url, { method: 'HEAD' });
      const response = await Promise.race([fetchPromise, timeoutPromise]);

      if (response && (response as Response).ok) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      return false;
    }
  };

  useEffect(() => {
    const checkPreviousIp = async () => {
      const savedIp = await loadSavedIp();
      if (savedIp) {
        Alert.alert(
          'Gespeicherte IP gefunden',
          `Möchtest du die gespeicherte IP (${savedIp}) verwenden?`,
          [
            {
              text: 'Neue IP eingeben',
              onPress: () => setIsLoading(false),
              style: 'cancel',
            },
            {
              text: 'Gespeicherte IP verwenden',
              onPress: async () => {
                const fullUrl = `http://${savedIp}:3000/public-dashboards/2dc727942b8b4f01be0deb0e0b415aec?orgId=1&refresh=5s`;
                setIsLoading(true);
                setPingMessage('Versuche gespeicherte IP zu pingen...');

                const pingSuccess = await pingUrl(fullUrl);
                if (pingSuccess) {
                  setPingMessage('Ping war erfolgreich. Neustart...');
                  setTimeout(() => {
                    setUrl(fullUrl);
                    setIsLoading(false);
                  }, 1000);
                } else {
                  setIsLoading(false);
                  Alert.alert('Ping fehlgeschlagen', 'Bitte gib eine neue IP-Adresse ein.');
                }
              },
            },
          ]
        );
      }
    };

    checkPreviousIp();

    const splashTimeout = setTimeout(() => {
      setShowSplashScreen(false);
    }, 3000);

    return () => clearTimeout(splashTimeout);
  }, []);

  const handleSetUrl = async () => {
    if (validateIpAddress(ipAddress)) {
      setIsLoading(true);
      const fullUrl = `http://${ipAddress}:3000/public-dashboards/2dc727942b8b4f01be0deb0e0b415aec?orgId=1&refresh=5s`;
      setPingMessage('Versuche, die IP mit der URL zu pingen...');

      const pingSuccess = await pingUrl(fullUrl, 5000);
      if (pingSuccess) {
        setPingMessage('Ping war erfolgreich. Verbindung wird aufgebaut...');
        await saveIpAddress(ipAddress);

        setTimeout(() => {
          setUrl(fullUrl);
          setIsLoading(false);
        }, 1000);
      } else {
        setIsLoading(false);
        Alert.alert('Ping fehlgeschlagen', 'Bitte gib eine andere IP-Adresse ein.');
      }
    } else {
      Alert.alert('Ungültige IP-Adresse', 'Bitte gib eine gültige IPv4-Adresse ein.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {showSplashScreen ? (
        <View style={styles.splashScreen}>
          <Image 
            source={require('./assets/Reiners Grafana Dashboard Splashscreen.webp')}
            style={styles.logo} 
            resizeMode="contain" 
          />
        </View>
      ) : (
        <>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FFFFFF" />
              <Text style={styles.loadingText}>{pingMessage}</Text>
            </View>
          ) : url ? (
            <View style={styles.container}>
              <WebView source={{ uri: url }} style={styles.webview} />
            </View>
          ) : (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Bitte gib die IPv4-Adresse des Servers ein:</Text>
              <TextInput
                style={styles.input}
                placeholder="z.B. 192.168.0.40"
                placeholderTextColor="#888"
                keyboardType="numeric"
                value={ipAddress}
                onChangeText={setIpAddress}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Button title="Bestätigen" onPress={handleSetUrl} />
            </View>
          )}
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#212121',
  },
  webview: {
    flex: 1,
  },
  inputContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  label: {
    fontSize: 18,
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  input: {
    width: '80%',
    padding: 10,
    borderColor: '#757575',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 20,
    backgroundColor: '#424242',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#212121',
  },
  loadingText: {
    fontSize: 18,
    color: '#fff',
    marginTop: 10,
  },
  splashScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#212121',
  },
  logo: {
    width: 200,
    height: 200,
  }
});

export default App; */

// neuer Code stand 02.02.25

import React, { useState, useEffect } from 'react';
import { SafeAreaView, StyleSheet, Text, View, Button, TextInput, ActivityIndicator, Alert, Image, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebView } from 'react-native-webview';
import { Client, Message } from 'paho-mqtt';

const App: React.FC = () => {
  const [showSplashScreen, setShowSplashScreen] = useState(true);
  const [ipAddress, setIpAddress] = useState<string>('');
  const [url, setUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [pingMessage, setPingMessage] = useState<string>('');
  const [isVentilatorOn, setIsVentilatorOn] = useState(false);
  const [dashboardId, setDashboardId] = useState<string>('');
  const [mqttClient, setMqttClient] = useState<any>(null);
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);
  const [buttonText, setButtonText] = useState('Ventilator AN');
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const [criticalError, setCriticalError] = useState<string | null>(null);

  const saveIpAddress = async (ip: string) => {
    try {
      await AsyncStorage.setItem('savedIp', ip);
    } catch (error) {
      console.error('Fehler beim Speichern der IP-Adresse', error);
    }
  };

  const loadSavedIp = async () => {
    try {
      const savedIp = await AsyncStorage.getItem('savedIp');
      if (savedIp) {
        return savedIp;
      }
      return null;
    } catch (error) {
      console.error('Fehler beim Laden der gespeicherten IP-Adresse', error);
      return null;
    }
  };

  const validateIpAddress = (ip: string) => {
    const ipv4Regex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipv4Regex.test(ip);
  };

  const pingUrl = async (url: string, timeout = 5000) => {
    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), timeout)
    );

    try {
      const fetchPromise = fetch(url, { method: 'HEAD' });
      const response = await Promise.race([fetchPromise, timeoutPromise]);

      if (response && (response as Response).ok) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      return false;
    }
  };

  useEffect(() => {
    const splashTimeout = setTimeout(() => {
      setShowSplashScreen(false);
    }, 3000);
    return () => clearTimeout(splashTimeout);
  }, []);

  const handleDashboardSelect = async (selectedDashboardId: string) => {
    setDashboardId(selectedDashboardId);
    const savedIp = await loadSavedIp();
    
    if (savedIp) {
      Alert.alert(
        'Gespeicherte IP gefunden',
        `Möchtest du die gespeicherte IP (${savedIp}) verwenden?`,
        [
          {
            text: 'Neue IP eingeben',
            onPress: () => setIpAddress(''),
            style: 'cancel',
          },
          {
            text: 'Gespeicherte IP verwenden',
            onPress: async () => {
              setIpAddress(savedIp);
              const fullUrl = `http://${savedIp}:3000/public-dashboards/${selectedDashboardId}?orgId=1&refresh=5s`;
              setIsLoading(true);
              setPingMessage('Versuche gespeicherte IP zu pingen...');

              const pingSuccess = await pingUrl(fullUrl);
              if (pingSuccess) {
                setPingMessage('Ping war erfolgreich. Verbindung wird aufgebaut...');
                setTimeout(() => {
                  setUrl(fullUrl);
                  setIsLoading(false);
                }, 1000);
              } else {
                setIsLoading(false);
                setIpAddress('');
                Alert.alert('Ping fehlgeschlagen', 'Bitte gib eine neue IP-Adresse ein.');
              }
            },
          },
        ]
      );
    }
  };

  const handleWebViewLoad = () => {
    try {
      setErrorMessages(prev => [...prev, "Initializing MQTT connection..."]);
      
      if (!ipAddress) {
        setCriticalError("IP Address not configured");
        return;
      }

      const client = new Client(
        ipAddress,
        8083,
        `client-${Math.random().toString(16).substring(2, 8)}`
      );

      client.onMessageArrived = (message: { payloadString: string }) => {
        const msg = `Message received: ${message.payloadString}`;
        console.log(msg);
        setErrorMessages(prev => [...prev, msg]);
        
        if (message.payloadString === 'Ventilator AN') {
          setIsVentilatorOn(true);
          setButtonText('Ventilator AUS');
        } else if (message.payloadString === 'Ventilator AUS') {
          setIsVentilatorOn(false);
          setButtonText('Ventilator AN');
        }
      };

      client.onConnectionLost = (responseObject: { errorMessage: string }) => {
        const error = `Connection lost: ${responseObject.errorMessage}`;
        console.log(error);
        setErrorMessages(prev => [...prev, error]);
        setCriticalError(error);
      };

      const connectOptions = {
        onSuccess: () => {
          const msg = 'MQTT Connected successfully';
          console.log(msg);
          setErrorMessages(prev => [...prev, msg]);
          setCriticalError(null);
          setMqttClient(client);
          client.subscribe('Ventilator');
        },
        onFailure: (e: { errorMessage: string; errorCode: number }) => {
          const error = `MQTT Connection failed: ${e.errorMessage} (${e.errorCode})`;
          console.log(error);
          setErrorMessages(prev => [...prev, error]);
          setCriticalError(error);
        },
        useSSL: false,
        keepAliveInterval: 30,
        reconnect: true
      };

      client.connect(connectOptions);
    } catch (error) {
      const errorMsg = `MQTT Setup error: ${error}`;
      console.log(errorMsg);
      setErrorMessages(prev => [...prev, errorMsg]);
      setCriticalError(errorMsg);
    }
  };

  const handleVentilatorToggle = () => {
    if (mqttClient && mqttClient.isConnected() && !isButtonDisabled) {
      setIsButtonDisabled(true);
      
      if (!isVentilatorOn) {
        setButtonText('Ventilator wird aktiviert');
        const message = new Message('Ventilator AN');
        message.destinationName = 'Ventilator';
        message.retained = true;
        mqttClient.send(message);
        
        setTimeout(() => {
          setIsVentilatorOn(true);
          setButtonText('Ventilator AUS');
          setIsButtonDisabled(false);
        }, 5000);
      } else {
        setButtonText('Ventilator wird deaktiviert');
        const message = new Message('Ventilator AUS');
        message.destinationName = 'Ventilator';
        message.retained = true;
        mqttClient.send(message);
        
        setTimeout(() => {
          setIsVentilatorOn(false);
          setButtonText('Ventilator AN');
          setIsButtonDisabled(false);
        }, 5000);
      }
    }
  };

  const handleSetUrl = async () => {
    if (validateIpAddress(ipAddress)) {
      setIsLoading(true);
      const fullUrl = `http://${ipAddress}:3000/public-dashboards/${dashboardId}?orgId=1&refresh=5s`;
      setPingMessage('Versuche, die IP mit der URL zu pingen...');

      const pingSuccess = await pingUrl(fullUrl, 5000);
      if (pingSuccess) {
        setPingMessage('Ping war erfolgreich. Verbindung wird aufgebaut...');
        await saveIpAddress(ipAddress);

        setTimeout(() => {
          setUrl(fullUrl);
          setIsLoading(false);
        }, 1000);
      } else {
        setIsLoading(false);
        Alert.alert('Ping fehlgeschlagen', 'Bitte gib eine andere IP-Adresse ein.');
      }
    } else {
      Alert.alert('Ungültige IP-Adresse', 'Bitte gib eine gültige IPv4-Adresse ein.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {showSplashScreen ? (
        <View style={styles.splashScreen}>
          <Image 
            source={require('./assets/Reiners Grafana Dashboard Splashscreen.webp')}
            style={styles.logo} 
            resizeMode="contain" 
          />
        </View>
      ) : !dashboardId ? (
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Wähle dein Dashboard:</Text>
          <View style={styles.buttonGroup}>
            <Button 
              title="Produktion" 
              onPress={() => handleDashboardSelect('2dc727942b8b4f01be0deb0e0b415aec')} 
            />
            <View style={styles.buttonSpacer} />
            <Button 
              title="Dev" 
              onPress={() => handleDashboardSelect('f9911416ee584c1fa54729be95e945e1')} 
            />
          </View>
        </View>
      ) : !url && !isLoading ? (
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Bitte gib die IPv4-Adresse des Servers ein:</Text>
          <TextInput
            style={styles.input}
            placeholder="z.B. 192.168.0.40"
            placeholderTextColor="#888"
            keyboardType="numeric"
            value={ipAddress}
            onChangeText={setIpAddress}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Button title="Bestätigen" onPress={handleSetUrl} />
        </View>
      ) : isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>{pingMessage}</Text>
        </View>
      ) : (
        <View style={styles.container}>
          <WebView 
            source={{ uri: url! }} 
            style={styles.webview}
            onLoadEnd={handleWebViewLoad}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              setCriticalError(`WebView error: ${nativeEvent.description}`);
            }}
          />
          {criticalError && (
            <View style={styles.errorOverlay}>
              <Text style={styles.errorTitle}>Error Occurred</Text>
              <Text style={styles.errorMessage}>{criticalError}</Text>
              <Button 
                title="Retry Connection" 
                onPress={handleWebViewLoad} 
              />
            </View>
          )}
          <View style={styles.buttonContainer}>
            <Button 
              title={buttonText}
              onPress={handleVentilatorToggle}
              disabled={isButtonDisabled}
            />
            <Text style={styles.statusText}>
              MQTT Status: {mqttClient?.isConnected() ? 'Verbunden' : 'Nicht verbunden'}
            </Text>
            <ScrollView style={styles.errorFeed}>
              {errorMessages.map((error, index) => (
                <Text key={index} style={styles.errorText}>{error}</Text>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#212121',
  },
  webview: {
    flex: 1,
  },
  inputContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  label: {
    fontSize: 18,
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  input: {
    width: '80%',
    padding: 10,
    borderColor: '#757575',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 20,
    backgroundColor: '#424242',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#212121',
  },
  loadingText: {
    fontSize: 18,
    color: '#fff',
    marginTop: 10,
  },
  splashScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#212121',
  },
  logo: {
    width: 200,
    height: 200,
  },
  buttonContainer: {
    padding: 20,
    backgroundColor: '#212121',
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '80%',
    marginTop: 20,
  },
  buttonSpacer: {
    width: 20,
  },
  statusText: {
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 10,
  },
  errorFeed: {
    maxHeight: 100,
    marginTop: 10,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 12,
    marginBottom: 5,
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    color: '#FF6B6B',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  errorMessage: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  }
});

export default App;









