import React, { useState, useEffect } from 'react';
import { SafeAreaView, StyleSheet, Text, View, Button, TextInput, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebView } from 'react-native-webview';

const App: React.FC = () => {
  const [ipAddress, setIpAddress] = useState<string>(''); // Zustand für die eingegebene IP-Adresse
  const [url, setUrl] = useState<string | null>(null); // Zustand für die dynamisch erstellte URL
  const [isLoading, setIsLoading] = useState<boolean>(false); // Zustand für den Ladebildschirm
  const [pingMessage, setPingMessage] = useState<string>(''); // Nachricht für den Ladebildschirm

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

      // Wenn die Antwort kommt und ok ist (status 200-299)
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
                const fullUrl = `http://${savedIp}:3000/public-dashboards/f9911416ee584c1fa54729be95e945e1?orgId=1&refresh=auto`;
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
  }, []);

  // Funktion zum Setzen der URL nach Eingabe der IP-Adresse und Pingen
  const handleSetUrl = async () => {
    if (validateIpAddress(ipAddress)) {
      setIsLoading(true); // Ladebildschirm anzeigen
      const fullUrl = `http://${ipAddress}:3000/public-dashboards/f9911416ee584c1fa54729be95e945e1?orgId=1&refresh=auto`;
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
      {isLoading ? (
        // Ladebildschirm anzeigen
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>{pingMessage}</Text>
        </View>
      ) : url ? (
        // Zeige WebView an, wenn eine gültige URL gesetzt ist
        <WebView source={{ uri: url }} style={styles.webview} />
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#C02020',
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
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  input: {
    width: '80%',
    padding: 10,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 20,
    backgroundColor: '#fff',
    color: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#fff',
    marginTop: 10,
  },
});

export default App;
