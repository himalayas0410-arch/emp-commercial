import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  StatusBar,
  ActivityIndicator,
  Linking,
  Modal,
  Platform
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import QRCode from 'react-native-qrcode-svg';

// Default LAN IP for physical device / Expo Go access over WiFi
const DEFAULT_API_URL = 'http://192.168.29.174:5000/api';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const ALLERGY_SEVERITIES = ['mild', 'moderate', 'severe', 'life_threatening'];
const RELATIONSHIP_OPTIONS = ['Spouse', 'Child', 'Parent', 'Doctor', 'Sibling', 'Colleague'];

export default function App() {
  return (
    <SafeAreaProvider>
      <MainApp />
    </SafeAreaProvider>
  );
}

function MainApp() {
  const insets = useSafeAreaInsets();
  const bottomBarPadding = Math.max(insets.bottom + 8, 16);
  const bottomBarHeight = 54 + bottomBarPadding;
  const scrollBottomPadding = bottomBarHeight + 24;
  const [apiUrl, setApiUrl] = useState<string>(DEFAULT_API_URL);
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [tempApiUrl, setTempApiUrl] = useState<string>(DEFAULT_API_URL);

  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'home' | 'profile' | 'qr' | 'family' | 'contacts' | 'scanner'>('home');

  // Employee Data
  const [profile, setProfile] = useState<any | null>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [qrToken, setQrToken] = useState<any | null>(null);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);

  // Public Scan Simulator state
  const [scanData, setScanData] = useState<any | null>(null);
  const [alertDispatched, setAlertDispatched] = useState<boolean>(false);
  const [customTokenInput, setCustomTokenInput] = useState<string>('');

  // Modals for editing & adding items
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [editBloodGroup, setEditBloodGroup] = useState('O+');
  const [editEmergencyNotes, setEditEmergencyNotes] = useState('');

  const [showAllergyModal, setShowAllergyModal] = useState(false);
  const [newAllergen, setNewAllergen] = useState('');
  const [newReaction, setNewReaction] = useState('');
  const [newSeverity, setNewSeverity] = useState('severe');

  const [showMedModal, setShowMedModal] = useState(false);
  const [newMedName, setNewMedName] = useState('');
  const [newMedDosage, setNewMedDosage] = useState('');
  const [newMedFreq, setNewMedFreq] = useState('');

  const [showCondModal, setShowCondModal] = useState(false);
  const [newCondName, setNewCondName] = useState('');

  const [showContactModal, setShowContactModal] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactRel, setNewContactRel] = useState('Spouse');
  const [newContactPhone, setNewContactPhone] = useState('');

  const [showFamilyModal, setShowFamilyModal] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState('');
  const [newFamilyRel, setNewFamilyRel] = useState('Child');
  const [newFamilyBlood, setNewFamilyBlood] = useState('O+');

  // Auth draft
  const [email, setEmail] = useState('rahul.sharma@apexglobal.com');
  const [password, setPassword] = useState('Emp@123');
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    try {
      const savedUrl = await AsyncStorage.getItem('emp_api_url');
      if (savedUrl) {
        setApiUrl(savedUrl);
        setTempApiUrl(savedUrl);
      }
      const savedToken = await AsyncStorage.getItem('emp_mobile_token');
      if (savedToken) {
        setToken(savedToken);
        await fetchProfile(savedToken, savedUrl || apiUrl);
      }
    } catch (e) {
      console.warn('Init error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveApiUrl = async () => {
    await AsyncStorage.setItem('emp_api_url', tempApiUrl);
    setApiUrl(tempApiUrl);
    setShowConfigModal(false);
    if (token) fetchProfile(token, tempApiUrl);
  };

  const login = async (loginEmail?: string, loginPass?: string) => {
    setAuthLoading(true);
    const em = loginEmail || email;
    const pw = loginPass || password;
    try {
      const res = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: em, password: pw })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      await AsyncStorage.setItem('emp_mobile_token', data.token);
      setToken(data.token);
      setUser(data.user);
      await fetchProfile(data.token, apiUrl);
    } catch (err: any) {
      Alert.alert('Sign In Failed', `${err.message}\nMake sure your computer server is running at:\n${apiUrl}`);
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem('emp_mobile_token');
    setToken(null);
    setUser(null);
    setProfile(null);
    setContacts([]);
    setFamilyMembers([]);
  };

  const fetchProfile = async (authToken: string, endpoint: string) => {
    try {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      };
      const [profRes, famRes] = await Promise.all([
        fetch(`${endpoint}/profiles/me`, { headers }),
        fetch(`${endpoint}/family`, { headers })
      ]);

      if (profRes.ok) {
        const profData = await profRes.json();
        setProfile(profData.profile);
        setContacts(profData.contacts || []);
        setQrToken(profData.qr_token || null);
        if (profData.profile) {
          setEditBloodGroup(profData.profile.blood_group || 'O+');
          setEditEmergencyNotes(profData.profile.emergency_notes || '');
        }
      }

      if (famRes.ok) {
        const famData = await famRes.json();
        setFamilyMembers(famData.family_members || []);
      }
    } catch (err) {
      console.warn('Error fetching profile data:', err);
    }
  };

  // QR Lifecycle Handlers
  const handleSuspendQR = async () => {
    try {
      const res = await fetch(`${apiUrl}/qr/suspend`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (res.ok) {
        setQrToken(data.qr_token);
        Alert.alert('QR Suspended', 'Public emergency scan access is now disabled.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleReactivateQR = async () => {
    try {
      const res = await fetch(`${apiUrl}/qr/reactivate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (res.ok) {
        setQrToken(data.qr_token);
        Alert.alert('QR Reactivated', 'Public emergency access is restored.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleRegenerateQR = async () => {
    Alert.alert(
      'Regenerate QR Code?',
      'Your previous printed QR code will be permanently revoked and replaced with a fresh token.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Regenerate Now',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(`${apiUrl}/qr/regenerate`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({})
              });
              const data = await res.json();
              if (res.ok) {
                setQrToken(data.qr_token);
                Alert.alert('New QR Minted', `New secure token: ${data.qr_token.public_token}`);
              }
            } catch (e: any) {
              Alert.alert('Error', e.message);
            }
          }
        }
      ]
    );
  };

  // DPDP Act 2023 Disclosure Toggle
  const toggleDisclosure = async (key: string) => {
    if (!profile) return;
    const updatedDisclosures = {
      ...profile.public_disclosures,
      [key]: !profile.public_disclosures[key]
    };
    try {
      const res = await fetch(`${apiUrl}/profiles/me`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_disclosures: updatedDisclosures })
      });
      const data = await res.json();
      if (res.ok) {
        setProfile(data.profile);
      }
    } catch (e: any) {
      Alert.alert('Update failed', e.message);
    }
  };

  // Save Vitals (Blood Group & Paramedic Notes)
  const handleSaveVitals = async () => {
    try {
      const res = await fetch(`${apiUrl}/profiles/me`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blood_group: editBloodGroup,
          emergency_notes: editEmergencyNotes
        })
      });
      const data = await res.json();
      if (res.ok) {
        setProfile(data.profile);
        setShowVitalsModal(false);
        Alert.alert('Saved', 'Clinical vitals updated successfully.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  // Allergy Handlers
  const handleAddAllergy = async () => {
    if (!newAllergen.trim()) return Alert.alert('Required', 'Enter allergen name.');
    const updatedAllergies = [
      ...(profile.allergies || []),
      {
        id: 'alg_' + Date.now().toString(36),
        allergen: newAllergen.trim(),
        reaction: newReaction.trim() || 'Acute reaction',
        severity: newSeverity
      }
    ];
    try {
      const res = await fetch(`${apiUrl}/profiles/me`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ allergies: updatedAllergies })
      });
      const data = await res.json();
      if (res.ok) {
        setProfile(data.profile);
        setNewAllergen('');
        setNewReaction('');
        setShowAllergyModal(false);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleDeleteAllergy = async (id: string) => {
    const updated = (profile.allergies || []).filter((a: any) => a.id !== id);
    try {
      const res = await fetch(`${apiUrl}/profiles/me`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ allergies: updated })
      });
      const data = await res.json();
      if (res.ok) setProfile(data.profile);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  // Medication Handlers
  const handleAddMedication = async () => {
    if (!newMedName.trim()) return Alert.alert('Required', 'Enter medication name.');
    const updatedMeds = [
      ...(profile.medications || []),
      {
        id: 'med_' + Date.now().toString(36),
        name: newMedName.trim(),
        dosage: newMedDosage.trim() || 'Daily',
        frequency: newMedFreq.trim() || 'Once daily',
        is_critical: true
      }
    ];
    try {
      const res = await fetch(`${apiUrl}/profiles/me`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ medications: updatedMeds })
      });
      const data = await res.json();
      if (res.ok) {
        setProfile(data.profile);
        setNewMedName('');
        setNewMedDosage('');
        setNewMedFreq('');
        setShowMedModal(false);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleDeleteMedication = async (id: string) => {
    const updated = (profile.medications || []).filter((m: any) => m.id !== id);
    try {
      const res = await fetch(`${apiUrl}/profiles/me`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ medications: updated })
      });
      const data = await res.json();
      if (res.ok) setProfile(data.profile);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  // Condition Handlers
  const handleAddCondition = async () => {
    if (!newCondName.trim()) return Alert.alert('Required', 'Enter condition name.');
    const updatedConds = [
      ...(profile.conditions || []),
      {
        id: 'cond_' + Date.now().toString(36),
        condition: newCondName.trim(),
        notes: ''
      }
    ];
    try {
      const res = await fetch(`${apiUrl}/profiles/me`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ conditions: updatedConds })
      });
      const data = await res.json();
      if (res.ok) {
        setProfile(data.profile);
        setNewCondName('');
        setShowCondModal(false);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleDeleteCondition = async (id: string) => {
    const updated = (profile.conditions || []).filter((c: any) => c.id !== id);
    try {
      const res = await fetch(`${apiUrl}/profiles/me`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ conditions: updated })
      });
      const data = await res.json();
      if (res.ok) setProfile(data.profile);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  // Contact Handlers
  const handleAddContact = async () => {
    if (!newContactName.trim() || !newContactPhone.trim()) {
      return Alert.alert('Required', 'Please enter contact name and phone number.');
    }
    try {
      const res = await fetch(`${apiUrl}/profiles/contacts`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newContactName.trim(),
          relationship: newContactRel,
          phone: newContactPhone.trim(),
          priority_order: contacts.length + 1,
          is_alert_recipient: true
        })
      });
      const data = await res.json();
      if (res.ok) {
        setContacts([...contacts, data.contact]);
        setNewContactName('');
        setNewContactPhone('');
        setShowContactModal(false);
        Alert.alert('Added', `${data.contact.name} added as emergency contact.`);
      } else {
        Alert.alert('Error', data.error || 'Failed to add contact');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleDeleteContact = async (id: string) => {
    Alert.alert('Delete Contact', 'Are you sure you want to remove this emergency contact?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await fetch(`${apiUrl}/profiles/contacts/${id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
              setContacts(contacts.filter(c => c.id !== id));
            }
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        }
      }
    ]);
  };

  // Family Handlers
  const handleAddDependent = async () => {
    if (!newFamilyName.trim()) {
      return Alert.alert('Required', 'Please enter family member full name.');
    }
    try {
      const res = await fetch(`${apiUrl}/family/dependent`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: newFamilyName.trim(),
          relationship_type: newFamilyRel,
          blood_group: newFamilyBlood,
          allergies: [],
          conditions: []
        })
      });
      const data = await res.json();
      if (res.ok) {
        setShowFamilyModal(false);
        setNewFamilyName('');
        if (token) fetchProfile(token, apiUrl);
        Alert.alert('Dependent Added', `${data.dependent_profile.full_name} enrolled with dedicated QR code!`);
      } else {
        Alert.alert('Error', data.error || 'Failed to add dependent');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleDeleteFamily = async (id: string) => {
    Alert.alert('Remove Member', 'Are you sure you want to remove this family member?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await fetch(`${apiUrl}/family/${id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
              setFamilyMembers(familyMembers.filter(f => f.id !== id));
            }
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        }
      }
    ]);
  };

  // Scanner Simulator
  const loadScanPreview = async (tok: string) => {
    try {
      setAlertDispatched(false);
      const res = await fetch(`${apiUrl}/emergency/${tok}`);
      const data = await res.json();
      setScanData(data);
      setActiveTab('scanner');
    } catch (e: any) {
      Alert.alert('Scan error', e.message);
    }
  };

  const sendEmergencyAlert = async (tok: string) => {
    try {
      const res = await fetch(`${apiUrl}/emergency/${tok}/alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location_address: 'GPS Verified Location' })
      });
      const data = await res.json();
      if (res.ok) {
        setAlertDispatched(true);
        Alert.alert('EMERGENCY ALERT SENT', `Alert dispatched to family & emergency desk!\nIncident Code: ${data.incident_code}`);
      }
    } catch (e: any) {
      Alert.alert('Alert Failed', e.message);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <ActivityIndicator size="large" color="#DC2626" />
        <Text style={{ marginTop: 12, color: '#94A3B8', fontWeight: '600' }}>Initializing EMP Mobile...</Text>
      </View>
    );
  }

  // 1. AUTH SCREEN
  if (!token) {
    return (
      <View style={[styles.authContainer, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" translucent backgroundColor="#0F172A" />
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 36 }}>
          <View style={{ alignItems: 'center', marginVertical: 32 }}>
            <View style={styles.logoBadge}>
              <Text style={{ color: '#FFFFFF', fontSize: 28, fontWeight: '900' }}>+</Text>
            </View>
            <Text style={styles.appTitle}>EMP Commercial</Text>
            <Text style={styles.appSubtitle}>Emergency Medical Portal • Mobile App</Text>
          </View>

          {/* Quick Demo Login Preset Buttons */}
          <View style={styles.demoBox}>
            <Text style={styles.demoTitle}>Instant Demo Account:</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <TouchableOpacity
                style={styles.demoBtn}
                onPress={() => login('rahul.sharma@apexglobal.com', 'Emp@123')}
              >
                <Text style={styles.demoBtnText}>Employee (Rahul)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.demoBtn}
                onPress={() => login('hr@apexglobal.com', 'Emp@123')}
              >
                <Text style={styles.demoBtnText}>HR Admin</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Form */}
          <View style={{ gap: 14 }}>
            <View>
              <Text style={styles.inputLabel}>Work Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="name@company.com"
                placeholderTextColor="#64748B"
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View>
              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#64748B"
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={styles.loginBtn}
              onPress={() => login()}
              disabled={authLoading}
            >
              {authLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.loginBtnText}>Sign In to EMP App</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Server Config Link */}
          <TouchableOpacity
            style={{ alignItems: 'center', marginTop: 32 }}
            onPress={() => setShowConfigModal(true)}
          >
            <Text style={{ color: '#0D9488', fontSize: 13, fontWeight: '600' }}>
              ⚙️ Server Endpoint: {apiUrl}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Server Config Modal */}
        <Modal visible={showConfigModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Configure API Host</Text>
              <Text style={{ color: '#64748B', fontSize: 13, marginBottom: 12 }}>
                Enter your development computer's local IP (port 5000) so this phone on WiFi can talk to the backend.
              </Text>
              <TextInput
                style={styles.input}
                value={tempApiUrl}
                onChangeText={setTempApiUrl}
                placeholder="http://192.168.x.x:5000/api"
                placeholderTextColor="#64748B"
              />
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
                <TouchableOpacity onPress={() => setShowConfigModal(false)} style={styles.cancelBtn}>
                  <Text style={{ color: '#0F172A', fontWeight: '600' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSaveApiUrl} style={styles.saveBtn}>
                  <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // 2. MAIN APP VIEW
  return (
    <View style={styles.container}>
      {/* Top Header with dynamic safe status bar inset */}
      <View style={{ backgroundColor: '#0F172A', paddingTop: insets.top }}>
        <StatusBar barStyle="light-content" translucent backgroundColor="#0F172A" />

        {/* Top App Header */}
        <View style={styles.appHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={styles.logoBadgeSmall}>
              <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 14 }}>+</Text>
            </View>
            <View>
              <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 16 }}>EMP Emergency</Text>
              <Text style={{ color: '#2DD4BF', fontSize: 11, fontWeight: '600' }}>
                {profile?.full_name || user?.full_name || 'Enrolled Member'}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              onPress={() => setShowConfigModal(true)}
              style={[styles.logoutBtn, { borderColor: '#0D9488' }]}
            >
              <Text style={{ color: '#2DD4BF', fontSize: 12, fontWeight: '700' }}>⚙️ Host</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
              <Text style={{ color: '#CBD5E1', fontSize: 12, fontWeight: '600' }}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Screen Body */}
      <ScrollView contentContainerStyle={[styles.screenContent, { paddingBottom: scrollBottomPadding }]}>
        {/* TAB 1: HOME */}
        {activeTab === 'home' && (
          <View style={{ gap: 16 }}>
            {/* Emergency Hotline Banner */}
            <View style={[styles.card, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#991B1B', fontWeight: '800', fontSize: 13 }}>COMPANY EMERGENCY DESK</Text>
                  <Text style={{ color: '#7F1D1D', fontSize: 12, marginTop: 2 }}>Apex 24/7 Hotline: +91 1800 223 456</Text>
                </View>
                <TouchableOpacity
                  style={[styles.callIconBtn, { backgroundColor: '#DC2626' }]}
                  onPress={() => Linking.openURL('tel:+911800223456')}
                >
                  <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 12 }}>📞 CALL</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Profile Completion Card */}
            <View style={styles.vitalsCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ color: '#94A3B8', fontSize: 12, fontWeight: '700' }}>PROFILE COMPLETION</Text>
                  <Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '800', marginTop: 2 }}>
                    {profile?.profile_completion_pct || 100}%
                  </Text>
                </View>
                <View style={styles.bloodBadge}>
                  <Text style={{ color: '#DC2626', fontSize: 10, fontWeight: '800' }}>BLOOD</Text>
                  <Text style={{ color: '#DC2626', fontSize: 18, fontWeight: '900' }}>
                    {profile?.blood_group || 'O+'}
                  </Text>
                </View>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressBar, { width: `${profile?.profile_completion_pct || 100}%` }]} />
              </View>
            </View>

            {/* Emergency QR Card */}
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={styles.cardTitle}>Emergency Medical QR</Text>
                <View style={[styles.badge, qrToken?.status === 'active' ? styles.badgeActive : styles.badgeSuspended]}>
                  <Text style={[styles.badgeText, qrToken?.status === 'active' ? { color: '#047857' } : { color: '#B45309' }]}>
                    {qrToken?.status?.toUpperCase() || 'ACTIVE'}
                  </Text>
                </View>
              </View>

              <View style={{ alignItems: 'center', paddingVertical: 12 }}>
                {qrToken?.status === 'active' && qrToken?.public_token ? (
                  <View style={styles.qrWrapper}>
                    <QRCode
                      value={`http://192.168.29.174:5173/e/${qrToken.public_token}`}
                      size={180}
                      color="#0F172A"
                      backgroundColor="#FFFFFF"
                    />
                  </View>
                ) : (
                  <View style={[styles.qrWrapper, { height: 180, justifyContent: 'center' }]}>
                    <Text style={{ color: '#B45309', fontWeight: '700' }}>QR SUSPENDED</Text>
                    <Text style={{ color: '#64748B', fontSize: 12, marginTop: 4 }}>Access disabled by owner</Text>
                  </View>
                )}
                <Text style={{ marginTop: 10, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontWeight: '700', color: '#64748B', fontSize: 13 }}>
                  {qrToken?.public_token || 'NO-TOKEN'}
                </Text>
              </View>

              {/* QR Actions */}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                {qrToken?.status === 'suspended' ? (
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#0D9488' }]} onPress={handleReactivateQR}>
                    <Text style={styles.actionBtnText}>Reactivate</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#475569' }]} onPress={handleSuspendQR}>
                    <Text style={styles.actionBtnText}>Suspend</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#DC2626' }]} onPress={handleRegenerateQR}>
                  <Text style={styles.actionBtnText}>Regenerate</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#0F172A' }]} onPress={() => loadScanPreview(qrToken?.public_token)}>
                  <Text style={styles.actionBtnText}>Test Scan →</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Severe Allergies Quick Glance */}
            {profile?.allergies?.length > 0 && (
              <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: '#DC2626' }]}>
                <Text style={{ color: '#DC2626', fontWeight: '800', fontSize: 13, marginBottom: 6 }}>
                  ⚠️ SEVERE ALLERGIES / ANAPHYLAXIS RISK
                </Text>
                {profile.allergies.map((a: any) => (
                  <Text key={a.id} style={{ color: '#0F172A', fontSize: 13, fontWeight: '600' }}>
                    • {a.allergen}: {a.reaction} ({a.severity})
                  </Text>
                ))}
              </View>
            )}

            {/* Emergency Contacts Quick List */}
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text style={styles.cardTitle}>Emergency Contacts ({contacts.length})</Text>
                <TouchableOpacity onPress={() => setActiveTab('contacts')}>
                  <Text style={{ color: '#0D9488', fontWeight: '700', fontSize: 12 }}>View All →</Text>
                </TouchableOpacity>
              </View>
              {contacts.map((c: any, i: number) => (
                <View key={c.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: i < contacts.length - 1 ? 1 : 0, borderBottomColor: '#F1F5F9' }}>
                  <View>
                    <Text style={{ fontWeight: '700', color: '#0F172A', fontSize: 14 }}>{c.name}</Text>
                    <Text style={{ color: '#64748B', fontSize: 12 }}>{c.relationship} • {c.phone}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.callIconBtn}
                    onPress={() => Linking.openURL(`tel:${c.phone}`)}
                  >
                    <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 12 }}>CALL</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* TAB 2: MEDICAL PROFILE (FULL EDIT & DPDP DISCLOSURES) */}
        {activeTab === 'profile' && (
          <View style={{ gap: 16 }}>
            {/* Clinical Vitals with Edit Button */}
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.cardTitle}>Essential Clinical Details</Text>
                <TouchableOpacity
                  onPress={() => setShowVitalsModal(true)}
                  style={{ backgroundColor: '#F0FDFA', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1, borderColor: '#CCFBF1' }}
                >
                  <Text style={{ color: '#0D9488', fontWeight: '700', fontSize: 12 }}>✏️ Edit</Text>
                </TouchableOpacity>
              </View>

              <View style={{ marginTop: 10, gap: 10 }}>
                <View>
                  <Text style={styles.inputLabel}>Full Name</Text>
                  <Text style={styles.dataVal}>{profile?.full_name}</Text>
                </View>
                <View>
                  <Text style={styles.inputLabel}>Blood Group</Text>
                  <Text style={[styles.dataVal, { color: '#DC2626', fontWeight: '800' }]}>{profile?.blood_group}</Text>
                </View>
                <View>
                  <Text style={styles.inputLabel}>Paramedic Emergency Instructions</Text>
                  <Text style={styles.dataVal}>{profile?.emergency_notes || 'None recorded'}</Text>
                </View>
              </View>
            </View>

            {/* Allergies Section with Add & Delete */}
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text style={styles.cardTitle}>Allergies ({profile?.allergies?.length || 0})</Text>
                <TouchableOpacity
                  onPress={() => setShowAllergyModal(true)}
                  style={{ backgroundColor: '#FEF2F2', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1, borderColor: '#FECACA' }}
                >
                  <Text style={{ color: '#DC2626', fontWeight: '700', fontSize: 12 }}>➕ Add Allergy</Text>
                </TouchableOpacity>
              </View>

              {(!profile?.allergies || profile.allergies.length === 0) ? (
                <Text style={{ color: '#94A3B8', fontSize: 13 }}>No known allergies recorded.</Text>
              ) : (
                profile.allergies.map((alg: any) => (
                  <View key={alg.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                    <View>
                      <Text style={{ fontWeight: '700', color: '#0F172A', fontSize: 14 }}>{alg.allergen}</Text>
                      <Text style={{ color: '#64748B', fontSize: 12 }}>{alg.reaction} • <Text style={{ color: '#DC2626', fontWeight: '700' }}>{alg.severity}</Text></Text>
                    </View>
                    <TouchableOpacity onPress={() => handleDeleteAllergy(alg.id)}>
                      <Text style={{ color: '#EF4444', fontSize: 13, fontWeight: '700' }}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>

            {/* Current Medications with Add & Delete */}
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text style={styles.cardTitle}>Medications ({profile?.medications?.length || 0})</Text>
                <TouchableOpacity
                  onPress={() => setShowMedModal(true)}
                  style={{ backgroundColor: '#F0FDF4', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1, borderColor: '#BBF7D0' }}
                >
                  <Text style={{ color: '#16A34A', fontWeight: '700', fontSize: 12 }}>➕ Add Med</Text>
                </TouchableOpacity>
              </View>

              {(!profile?.medications || profile.medications.length === 0) ? (
                <Text style={{ color: '#94A3B8', fontSize: 13 }}>No ongoing medications recorded.</Text>
              ) : (
                profile.medications.map((m: any) => (
                  <View key={m.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                    <View>
                      <Text style={{ fontWeight: '700', color: '#0F172A', fontSize: 14 }}>{m.name}</Text>
                      <Text style={{ color: '#64748B', fontSize: 12 }}>{m.dosage} • {m.frequency}</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleDeleteMedication(m.id)}>
                      <Text style={{ color: '#EF4444', fontSize: 13, fontWeight: '700' }}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>

            {/* Chronic Conditions with Add & Delete */}
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text style={styles.cardTitle}>Conditions ({profile?.conditions?.length || 0})</Text>
                <TouchableOpacity
                  onPress={() => setShowCondModal(true)}
                  style={{ backgroundColor: '#F8FAFC', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1, borderColor: '#CBD5E1' }}
                >
                  <Text style={{ color: '#0F172A', fontWeight: '700', fontSize: 12 }}>➕ Add Condition</Text>
                </TouchableOpacity>
              </View>

              {(!profile?.conditions || profile.conditions.length === 0) ? (
                <Text style={{ color: '#94A3B8', fontSize: 13 }}>No chronic conditions recorded.</Text>
              ) : (
                profile.conditions.map((c: any) => (
                  <View key={c.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                    <Text style={{ fontWeight: '700', color: '#0F172A', fontSize: 14 }}>{c.condition}</Text>
                    <TouchableOpacity onPress={() => handleDeleteCondition(c.id)}>
                      <Text style={{ color: '#EF4444', fontSize: 13, fontWeight: '700' }}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>

            {/* Granular DPDP 2023 Disclosure Controls */}
            <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: '#0D9488' }]}>
              <Text style={styles.cardTitle}>Public QR Disclosures (DPDP Act 2023)</Text>
              <Text style={{ color: '#64748B', fontSize: 12, marginTop: 2, marginBottom: 12 }}>
                Control what is publicly visible when somebody scans your physical emergency QR code.
              </Text>

              {[
                { key: 'blood_group', label: 'Blood Group' },
                { key: 'allergies', label: 'Allergies & Reactions' },
                { key: 'medications', label: 'Current Medications' },
                { key: 'conditions', label: 'Chronic Medical Conditions' },
                { key: 'devices', label: 'Implanted Devices (Pacemaker/Stent)' },
                { key: 'emergency_notes', label: 'Paramedic Instructions' }
              ].map(item => (
                <View key={item.key} style={styles.switchRow}>
                  <Text style={{ color: '#0F172A', fontWeight: '600', fontSize: 13 }}>{item.label}</Text>
                  <Switch
                    value={profile?.public_disclosures?.[item.key] ?? true}
                    onValueChange={() => toggleDisclosure(item.key)}
                    trackColor={{ false: '#CBD5E1', true: '#0D9488' }}
                  />
                </View>
              ))}
            </View>
          </View>
        )}

        {/* TAB 3: QR CODE DEDICATED */}
        {activeTab === 'qr' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Personal Emergency QR Code</Text>
            <Text style={{ color: '#64748B', fontSize: 12, marginTop: 4 }}>
              Show this code to first responders or print it onto an ID card / helmet sticker.
            </Text>

            <View style={{ alignItems: 'center', marginVertical: 24 }}>
              {qrToken?.status === 'active' && qrToken?.public_token ? (
                <View style={[styles.qrWrapper, { padding: 16 }]}>
                  <QRCode
                    value={`http://192.168.29.174:5173/e/${qrToken.public_token}`}
                    size={220}
                    color="#0F172A"
                    backgroundColor="#FFFFFF"
                  />
                </View>
              ) : (
                <View style={[styles.qrWrapper, { height: 220, justifyContent: 'center' }]}>
                  <Text style={{ color: '#DC2626', fontWeight: '800' }}>QR SUSPENDED / INACTIVE</Text>
                </View>
              )}
              <Text style={{ marginTop: 12, fontWeight: '800', fontSize: 16, color: '#0F172A' }}>
                {qrToken?.public_token}
              </Text>
              <Text style={{ color: '#64748B', fontSize: 12 }}>Scans Recorded: {qrToken?.scan_count || 0}</Text>
            </View>

            <TouchableOpacity
              style={[styles.loginBtn, { backgroundColor: '#0D9488' }]}
              onPress={() => loadScanPreview(qrToken?.public_token)}
            >
              <Text style={styles.loginBtnText}>Test Public Scanner Page</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* TAB 4: FAMILY & DEPENDENTS */}
        {activeTab === 'family' && (
          <View style={{ gap: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.cardTitle}>Family Members ({familyMembers.length})</Text>
              <TouchableOpacity
                onPress={() => setShowFamilyModal(true)}
                style={{ backgroundColor: '#0D9488', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12 }}>➕ Add Dependent</Text>
              </TouchableOpacity>
            </View>

            {familyMembers.map((member: any) => (
              <View key={member.id} style={styles.card}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View>
                    <Text style={{ fontWeight: '800', fontSize: 15, color: '#0F172A' }}>{member.full_name}</Text>
                    <Text style={{ color: '#64748B', fontSize: 12, marginTop: 2 }}>
                      {member.relationship_type} • {member.is_dependent ? 'Dependent Profile' : 'Independent Account'}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={[styles.badge, styles.badgeActive]}>
                      <Text style={[styles.badgeText, { color: '#047857' }]}>Active QR</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleDeleteFamily(member.id)} style={{ padding: 4 }}>
                      <Text style={{ color: '#EF4444', fontSize: 13 }}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {member.public_token && (
                  <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 12, color: '#475569', fontWeight: '700' }}>
                      Token: {member.public_token}
                    </Text>
                    <TouchableOpacity
                      onPress={() => loadScanPreview(member.public_token)}
                      style={{ backgroundColor: '#F0FDFA', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1, borderColor: '#CCFBF1' }}
                    >
                      <Text style={{ color: '#0D9488', fontWeight: '700', fontSize: 11 }}>View QR</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* TAB 5: CONTACTS */}
        {activeTab === 'contacts' && (
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.cardTitle}>Emergency Response Contacts</Text>
              <TouchableOpacity
                onPress={() => setShowContactModal(true)}
                style={{ backgroundColor: '#0D9488', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12 }}>➕ Add Contact</Text>
              </TouchableOpacity>
            </View>

            {contacts.map((c: any, idx: number) => (
              <View key={c.id} style={styles.card}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontWeight: '800', color: '#0F172A', fontSize: 15 }}>{c.name}</Text>
                      {idx === 0 && (
                        <View style={[styles.badge, { backgroundColor: '#FEE2E2' }]}>
                          <Text style={{ color: '#DC2626', fontSize: 10, fontWeight: '800' }}>PRIMARY</Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ color: '#64748B', fontSize: 12, marginTop: 2 }}>{c.relationship}</Text>
                    <Text style={{ color: '#0F172A', fontSize: 13, fontWeight: '700', marginTop: 4 }}>{c.phone}</Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TouchableOpacity
                      style={[styles.callIconBtn, { paddingHorizontal: 14, paddingVertical: 8 }]}
                      onPress={() => Linking.openURL(`tel:${c.phone}`)}
                    >
                      <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 13 }}>📞 CALL</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteContact(c.id)} style={{ padding: 6 }}>
                      <Text style={{ color: '#EF4444', fontSize: 14 }}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* TAB 6: PUBLIC SCANNER / FIRST RESPONDER */}
        {activeTab === 'scanner' && (
          <View style={{ gap: 16 }}>
            {/* Direct Token Lookup Bar */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Simulate QR Scan (Any Token)</Text>
              <Text style={{ color: '#64748B', fontSize: 12, marginTop: 2, marginBottom: 10 }}>
                Test any employee, dependent, or revoked emergency QR code:
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  style={[styles.input, { flex: 1, backgroundColor: '#F8FAFC', color: '#0F172A', borderColor: '#CBD5E1' }]}
                  value={customTokenInput}
                  onChangeText={setCustomTokenInput}
                  placeholder={qrToken?.public_token || 'EMP-RAHUL-789X'}
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="characters"
                />
                <TouchableOpacity
                  style={[styles.loginBtn, { marginTop: 0, paddingHorizontal: 16, backgroundColor: '#0D9488' }]}
                  onPress={() => loadScanPreview(customTokenInput || qrToken?.public_token || 'EMP-RAHUL-789X')}
                >
                  <Text style={[styles.loginBtnText, { fontSize: 13 }]}>Lookup</Text>
                </TouchableOpacity>
              </View>

              {/* Quick Preset Buttons */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                <TouchableOpacity
                  onPress={() => loadScanPreview(qrToken?.public_token)}
                  style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#0D9488' }}>My Token ({qrToken?.public_token})</Text>
                </TouchableOpacity>
                {familyMembers.map((fm: any) => (
                  <TouchableOpacity
                    key={fm.id}
                    onPress={() => loadScanPreview(fm.public_token)}
                    style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#0369A1' }}>{fm.full_name} ({fm.public_token})</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={{ backgroundColor: '#7F1D1D', padding: 20, borderRadius: 16, alignItems: 'center' }}>
              <Text style={{ color: '#FEE2E2', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' }}>
                First Responder View (Zero Login)
              </Text>
              <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '900', marginTop: 6 }}>
                {scanData?.display_name || 'Emergency Profile'}
              </Text>

              {scanData?.blood_group && (
                <View style={[styles.bloodBadge, { marginTop: 12, backgroundColor: '#FFFFFF' }]}>
                  <Text style={{ color: '#DC2626', fontSize: 10, fontWeight: '800' }}>BLOOD GROUP</Text>
                  <Text style={{ color: '#DC2626', fontSize: 22, fontWeight: '900' }}>{scanData.blood_group}</Text>
                </View>
              )}
            </View>

            {/* Call Primary Contacts */}
            {scanData?.emergency_contacts?.map((c: any) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.card, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
                onPress={() => Linking.openURL(`tel:${c.phone}`)}
              >
                <View>
                  <Text style={{ fontWeight: '800', color: '#0F172A', fontSize: 15 }}>Call {c.name}</Text>
                  <Text style={{ color: '#64748B', fontSize: 12 }}>{c.relationship} • {c.phone}</Text>
                </View>
                <Text style={{ color: '#059669', fontWeight: '800', fontSize: 13 }}>DIAL 📞</Text>
              </TouchableOpacity>
            ))}

            {/* SEND EMERGENCY ALERT BUTTON */}
            <View style={[styles.card, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
              <Text style={{ fontWeight: '800', color: '#991B1B', fontSize: 14, textAlign: 'center' }}>
                DIGITAL INCIDENT DISPATCH
              </Text>
              <Text style={{ color: '#7F1D1D', fontSize: 12, textAlign: 'center', marginTop: 4, marginBottom: 12 }}>
                Pushes emergency alert across SMS, Email, and In-App notifications.
              </Text>

              <TouchableOpacity
                style={[styles.loginBtn, { backgroundColor: '#DC2626' }]}
                onPress={() => sendEmergencyAlert(scanData?.public_token || qrToken?.public_token)}
              >
                <Text style={styles.loginBtnText}>🚨 SEND EMERGENCY ALERT</Text>
              </TouchableOpacity>

              {alertDispatched && (
                <View style={{ marginTop: 10, backgroundColor: '#D1FAE5', padding: 8, borderRadius: 6 }}>
                  <Text style={{ color: '#065F46', fontWeight: '700', fontSize: 12, textAlign: 'center' }}>
                    ✓ Alert successfully dispatched to contacts
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <View style={[styles.bottomBar, { height: bottomBarHeight, paddingBottom: bottomBarPadding }]}>
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('home')}>
          <Text style={[styles.navIcon, activeTab === 'home' && styles.navActive]}>🏠</Text>
          <Text style={[styles.navLabel, activeTab === 'home' && styles.navActive]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('profile')}>
          <Text style={[styles.navIcon, activeTab === 'profile' && styles.navActive]}>📋</Text>
          <Text style={[styles.navLabel, activeTab === 'profile' && styles.navActive]}>Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('qr')}>
          <Text style={[styles.navIcon, activeTab === 'qr' && styles.navActive]}>📲</Text>
          <Text style={[styles.navLabel, activeTab === 'qr' && styles.navActive]}>QR Code</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('family')}>
          <Text style={[styles.navIcon, activeTab === 'family' && styles.navActive]}>👨‍👩‍👧</Text>
          <Text style={[styles.navLabel, activeTab === 'family' && styles.navActive]}>Family</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('contacts')}>
          <Text style={[styles.navIcon, activeTab === 'contacts' && styles.navActive]}>📞</Text>
          <Text style={[styles.navLabel, activeTab === 'contacts' && styles.navActive]}>Contacts</Text>
        </TouchableOpacity>
      </View>

      {/* MODAL 1: Edit Vitals & Notes */}
      <Modal visible={showVitalsModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Clinical Vitals</Text>
            <Text style={styles.inputLabel}>Blood Group</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {BLOOD_GROUPS.map(bg => (
                <TouchableOpacity
                  key={bg}
                  onPress={() => setEditBloodGroup(bg)}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: editBloodGroup === bg ? '#DC2626' : '#CBD5E1',
                    backgroundColor: editBloodGroup === bg ? '#FEE2E2' : '#FFFFFF'
                  }}
                >
                  <Text style={{ fontWeight: '700', color: editBloodGroup === bg ? '#DC2626' : '#0F172A', fontSize: 13 }}>{bg}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Paramedic Instructions</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top', backgroundColor: '#F8FAFC', color: '#0F172A', borderColor: '#CBD5E1' }]}
              multiline
              value={editEmergencyNotes}
              onChangeText={setEditEmergencyNotes}
              placeholder="e.g. Carry EpiPen, Asthmatic, Penicillin allergy"
              placeholderTextColor="#94A3B8"
            />

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <TouchableOpacity onPress={() => setShowVitalsModal(false)} style={styles.cancelBtn}>
                <Text style={{ color: '#0F172A', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveVitals} style={styles.saveBtn}>
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Save Vitals</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: Add Allergy */}
      <Modal visible={showAllergyModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Allergy</Text>
            <Text style={styles.inputLabel}>Allergen (Food, Drug, Insect)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: '#F8FAFC', color: '#0F172A', borderColor: '#CBD5E1', marginBottom: 10 }]}
              value={newAllergen}
              onChangeText={setNewAllergen}
              placeholder="e.g. Penicillin, Peanuts"
              placeholderTextColor="#94A3B8"
            />
            <Text style={styles.inputLabel}>Reaction</Text>
            <TextInput
              style={[styles.input, { backgroundColor: '#F8FAFC', color: '#0F172A', borderColor: '#CBD5E1', marginBottom: 10 }]}
              value={newReaction}
              onChangeText={setNewReaction}
              placeholder="e.g. Anaphylaxis, Hives, Wheezing"
              placeholderTextColor="#94A3B8"
            />
            <Text style={styles.inputLabel}>Severity</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
              {ALLERGY_SEVERITIES.map(s => (
                <TouchableOpacity
                  key={s}
                  onPress={() => setNewSeverity(s)}
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: newSeverity === s ? '#DC2626' : '#CBD5E1',
                    backgroundColor: newSeverity === s ? '#FEE2E2' : '#FFFFFF'
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: newSeverity === s ? '#DC2626' : '#0F172A' }}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
              <TouchableOpacity onPress={() => setShowAllergyModal(false)} style={styles.cancelBtn}>
                <Text style={{ color: '#0F172A', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAddAllergy} style={[styles.saveBtn, { backgroundColor: '#DC2626' }]}>
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Add Allergy</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: Add Medication */}
      <Modal visible={showMedModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Current Medication</Text>
            <Text style={styles.inputLabel}>Medication Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: '#F8FAFC', color: '#0F172A', borderColor: '#CBD5E1', marginBottom: 10 }]}
              value={newMedName}
              onChangeText={setNewMedName}
              placeholder="e.g. Metformin, Insulin, Atenolol"
              placeholderTextColor="#94A3B8"
            />
            <Text style={styles.inputLabel}>Dosage</Text>
            <TextInput
              style={[styles.input, { backgroundColor: '#F8FAFC', color: '#0F172A', borderColor: '#CBD5E1', marginBottom: 10 }]}
              value={newMedDosage}
              onChangeText={setNewMedDosage}
              placeholder="e.g. 500mg, 10 units"
              placeholderTextColor="#94A3B8"
            />
            <Text style={styles.inputLabel}>Frequency</Text>
            <TextInput
              style={[styles.input, { backgroundColor: '#F8FAFC', color: '#0F172A', borderColor: '#CBD5E1', marginBottom: 12 }]}
              value={newMedFreq}
              onChangeText={setNewMedFreq}
              placeholder="e.g. Twice daily with meals"
              placeholderTextColor="#94A3B8"
            />

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
              <TouchableOpacity onPress={() => setShowMedModal(false)} style={styles.cancelBtn}>
                <Text style={{ color: '#0F172A', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAddMedication} style={[styles.saveBtn, { backgroundColor: '#16A34A' }]}>
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Add Med</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 4: Add Condition */}
      <Modal visible={showCondModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Chronic Condition</Text>
            <Text style={styles.inputLabel}>Condition Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: '#F8FAFC', color: '#0F172A', borderColor: '#CBD5E1', marginBottom: 16 }]}
              value={newCondName}
              onChangeText={setNewCondName}
              placeholder="e.g. Type 2 Diabetes, Asthma, Hypertension"
              placeholderTextColor="#94A3B8"
            />

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
              <TouchableOpacity onPress={() => setShowCondModal(false)} style={styles.cancelBtn}>
                <Text style={{ color: '#0F172A', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAddCondition} style={styles.saveBtn}>
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Add Condition</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 5: Add Contact */}
      <Modal visible={showContactModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Emergency Contact</Text>
            <Text style={styles.inputLabel}>Contact Full Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: '#F8FAFC', color: '#0F172A', borderColor: '#CBD5E1', marginBottom: 10 }]}
              value={newContactName}
              onChangeText={setNewContactName}
              placeholder="e.g. Anita Sharma"
              placeholderTextColor="#94A3B8"
            />
            <Text style={styles.inputLabel}>Relationship</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {RELATIONSHIP_OPTIONS.map(rel => (
                <TouchableOpacity
                  key={rel}
                  onPress={() => setNewContactRel(rel)}
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: newContactRel === rel ? '#0D9488' : '#CBD5E1',
                    backgroundColor: newContactRel === rel ? '#F0FDFA' : '#FFFFFF'
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: newContactRel === rel ? '#0D9488' : '#0F172A' }}>{rel}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              style={[styles.input, { backgroundColor: '#F8FAFC', color: '#0F172A', borderColor: '#CBD5E1', marginBottom: 16 }]}
              value={newContactPhone}
              onChangeText={setNewContactPhone}
              placeholder="+91 98765 43210"
              placeholderTextColor="#94A3B8"
              keyboardType="phone-pad"
            />

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
              <TouchableOpacity onPress={() => setShowContactModal(false)} style={styles.cancelBtn}>
                <Text style={{ color: '#0F172A', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAddContact} style={styles.saveBtn}>
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Save Contact</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 6: Add Family / Dependent */}
      <Modal visible={showFamilyModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Family Dependent</Text>
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: '#F8FAFC', color: '#0F172A', borderColor: '#CBD5E1', marginBottom: 10 }]}
              value={newFamilyName}
              onChangeText={setNewFamilyName}
              placeholder="e.g. Aarav Sharma"
              placeholderTextColor="#94A3B8"
            />
            <Text style={styles.inputLabel}>Relationship</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {['Child', 'Spouse', 'Parent'].map(rel => (
                <TouchableOpacity
                  key={rel}
                  onPress={() => setNewFamilyRel(rel)}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: newFamilyRel === rel ? '#0D9488' : '#CBD5E1',
                    backgroundColor: newFamilyRel === rel ? '#F0FDFA' : '#FFFFFF'
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: newFamilyRel === rel ? '#0D9488' : '#0F172A' }}>{rel}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Blood Group</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
              {BLOOD_GROUPS.map(bg => (
                <TouchableOpacity
                  key={bg}
                  onPress={() => setNewFamilyBlood(bg)}
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: newFamilyBlood === bg ? '#DC2626' : '#CBD5E1',
                    backgroundColor: newFamilyBlood === bg ? '#FEE2E2' : '#FFFFFF'
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: newFamilyBlood === bg ? '#DC2626' : '#0F172A' }}>{bg}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
              <TouchableOpacity onPress={() => setShowFamilyModal(false)} style={styles.cancelBtn}>
                <Text style={{ color: '#0F172A', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAddDependent} style={styles.saveBtn}>
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Enroll & Mint QR</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Server Config Modal */}
      <Modal visible={showConfigModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Configure API Host</Text>
            <Text style={{ color: '#64748B', fontSize: 13, marginBottom: 12 }}>
              Enter your computer's local IP address (port 5000) so your phone on WiFi can communicate with the backend.
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: '#F8FAFC', color: '#0F172A', borderColor: '#CBD5E1' }]}
              value={tempApiUrl}
              onChangeText={setTempApiUrl}
              placeholder="http://192.168.x.x:5000/api"
              placeholderTextColor="#94A3B8"
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
              <TouchableOpacity onPress={() => setShowConfigModal(false)} style={styles.cancelBtn}>
                <Text style={{ color: '#0F172A', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveApiUrl} style={styles.saveBtn}>
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  authContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  appHeader: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  screenContent: {
    padding: 16,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  logoBadgeSmall: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  appSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
  },
  demoBox: {
    backgroundColor: '#1E293B',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  demoTitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  demoBtn: {
    flex: 1,
    backgroundColor: '#334155',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  demoBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  inputLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#1E293B',
    color: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#334155',
  },
  loginBtn: {
    backgroundColor: '#DC2626',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  logoutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  vitalsCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
  },
  bloodBadge: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: 'center',
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#334155',
    borderRadius: 99,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#2DD4BF',
    borderRadius: 99,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  badgeActive: {
    backgroundColor: '#D1FAE5',
  },
  badgeSuspended: {
    backgroundColor: '#FEF3C7',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  qrWrapper: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  callIconBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  dataVal: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    elevation: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  navIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  navLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
  },
  navActive: {
    color: '#0D9488',
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 380,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#0D9488',
  },
});
