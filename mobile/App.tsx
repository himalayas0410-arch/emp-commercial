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

// Default API URL (Live Vercel Production API, overrideable via Host button)
const DEFAULT_API_URL = 'https://emp-commercial.vercel.app/api';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const ALLERGY_SEVERITIES = ['mild', 'moderate', 'severe', 'life_threatening'];
const RELATIONSHIP_OPTIONS = ['Spouse', 'Child', 'Parent', 'Doctor', 'Sibling', 'Colleague', 'Guardian'];

export default function App() {
  return (
    <SafeAreaProvider>
      <MainApp />
    </SafeAreaProvider>
  );
}

function MainApp() {
  const insets = useSafeAreaInsets();
  const bottomBarPadding = Math.max(insets.bottom + 6, 14);
  const bottomBarHeight = 52 + bottomBarPadding;
  const scrollBottomPadding = bottomBarHeight + 20;

  // Server Endpoint Configuration
  const [apiUrl, setApiUrl] = useState<string>(DEFAULT_API_URL);
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [tempApiUrl, setTempApiUrl] = useState<string>(DEFAULT_API_URL);

  // Authentication State
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('rahul.sharma@apexglobal.com');
  const [password, setPassword] = useState('Emp@123');
  const [regFullName, setRegFullName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regRole, setRegRole] = useState<'employee' | 'student' | 'individual' | 'company_admin'>('employee');
  const [regOrgName, setRegOrgName] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Active Tab: home | profile | qr | family | org | contacts | scanner
  const [activeTab, setActiveTab] = useState<'home' | 'profile' | 'qr' | 'family' | 'org' | 'contacts' | 'scanner'>('home');

  // Medical Profile & Personal QR
  const [profile, setProfile] = useState<any | null>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [qrToken, setQrToken] = useState<any | null>(null);

  // Family Linking Hub State
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [pendingFamilyRequests, setPendingFamilyRequests] = useState<any[]>([]);
  const [showDependentModal, setShowDependentModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState<any | null>(null);

  // Family Drafts
  const [depName, setDepName] = useState('');
  const [depRel, setDepRel] = useState('Child');
  const [depDob, setDepDob] = useState('');
  const [depBlood, setDepBlood] = useState('O+');
  const [depNotes, setDepNotes] = useState('');

  const [invName, setInvName] = useState('');
  const [invRel, setInvRel] = useState('Spouse');
  const [invEmail, setInvEmail] = useState('');
  const [invPhone, setInvPhone] = useState('');

  const [linkEmail, setLinkEmail] = useState('');
  const [linkRel, setLinkRel] = useState('Spouse');

  const [permAlerts, setPermAlerts] = useState<boolean>(true);
  const [permMedical, setPermMedical] = useState<boolean>(false);
  const [permManageQR, setPermManageQR] = useState<boolean>(false);

  // Organization & Duty-of-Care Membership
  const [orgStatus, setOrgStatus] = useState<any | null>(null);
  const [showJoinOrgModal, setShowJoinOrgModal] = useState(false);
  const [joinCompanyCode, setJoinCompanyCode] = useState('');
  const [joinEmployeeId, setJoinEmployeeId] = useState('');
  const [joinDepartment, setJoinDepartment] = useState('');
  const [orgLoading, setOrgLoading] = useState(false);

  // Emergency Incident History
  const [incidents, setIncidents] = useState<any[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Public Scan Simulator state
  const [scanData, setScanData] = useState<any | null>(null);
  const [alertDispatched, setAlertDispatched] = useState<boolean>(false);
  const [customTokenInput, setCustomTokenInput] = useState<string>('');

  // Modals for editing clinical profile
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

  const [showSurgeryModal, setShowSurgeryModal] = useState(false);
  const [newSurgeryProcedure, setNewSurgeryProcedure] = useState('');
  const [newSurgeryYear, setNewSurgeryYear] = useState('');

  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDeviceDetails, setNewDeviceDetails] = useState('');

  const [showContactModal, setShowContactModal] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactRel, setNewContactRel] = useState('Spouse');
  const [newContactPhone, setNewContactPhone] = useState('');

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

  // Sign In Handler
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
      Alert.alert('Sign In Failed', `${err.message}\nMake sure your server is running at:\n${apiUrl}`);
    } finally {
      setAuthLoading(false);
    }
  };

  // Direct Independent Registration Handler (No HR invite required)
  const handleRegister = async () => {
    if (!email.trim() || !password.trim() || !regFullName.trim()) {
      return Alert.alert('Missing Fields', 'Full Name, Email, and Password are required.');
    }
    if (regRole === 'company_admin' && !regOrgName.trim()) {
      return Alert.alert('Missing Fields', 'Organization Name is required to register as HR Admin.');
    }

    setAuthLoading(true);
    try {
      const res = await fetch(`${apiUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim(),
          full_name: regFullName.trim(),
          phone: regPhone.trim() || undefined,
          role: regRole,
          organization_name: regRole === 'company_admin' ? regOrgName.trim() : undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      await AsyncStorage.setItem('emp_mobile_token', data.token);
      setToken(data.token);
      setUser(data.user);
      await fetchProfile(data.token, apiUrl);
      Alert.alert(
        'Account Created!',
        `Welcome to EMP Commercial, ${data.user.full_name}. Your personal medical profile and emergency QR code have been minted.`
      );
    } catch (err: any) {
      Alert.alert('Registration Failed', err.message);
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
    setPendingFamilyRequests([]);
    setOrgStatus(null);
    setIncidents([]);
  };

  // Comprehensive profile & ecosystem data fetch
  const fetchProfile = async (authToken: string, endpoint: string) => {
    try {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      };

      const [profRes, famRes, reqRes, orgRes, incRes] = await Promise.all([
        fetch(`${endpoint}/profiles/me`, { headers }),
        fetch(`${endpoint}/family`, { headers }),
        fetch(`${endpoint}/family/requests/pending`, { headers }),
        fetch(`${endpoint}/organization/my-status`, { headers }),
        fetch(`${endpoint}/emergency/history/me`, { headers })
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

      if (reqRes.ok) {
        const reqData = await reqRes.json();
        setPendingFamilyRequests(reqData.pending_requests || []);
      }

      if (orgRes.ok) {
        const orgData = await orgRes.json();
        setOrgStatus(orgData);
      }

      if (incRes.ok) {
        const incData = await incRes.json();
        setIncidents(incData.incidents || []);
      }
    } catch (err) {
      console.warn('Error fetching ecosystem data:', err);
    }
  };

  // QR Lifecycle Handlers (Suspend, Reactivate, Regenerate, Revoke, Generate)
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

  const handleRevokeQR = async () => {
    Alert.alert(
      'Permanently Revoke QR Code?',
      'First responders scanning your physical badge will see an INVALID badge warning until you generate a fresh QR code.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Permanently Revoke',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(`${apiUrl}/qr/revoke`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({})
              });
              const data = await res.json();
              if (res.ok) {
                setQrToken(data.qr_token);
                Alert.alert('QR Revoked', 'This QR code is now permanently inactive.');
              }
            } catch (e: any) {
              Alert.alert('Error', e.message);
            }
          }
        }
      ]
    );
  };

  const handleGenerateQR = async () => {
    try {
      const res = await fetch(`${apiUrl}/qr/generate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (res.ok) {
        setQrToken(data.qr_token);
        Alert.alert('New QR Active', `Fresh token generated: ${data.qr_token.public_token}`);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
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

  // Add Allergy
  const handleAddAllergy = async () => {
    if (!newAllergen.trim()) return Alert.alert('Required', 'Please enter allergen.');
    const updated = [
      ...(profile?.allergies || []),
      { id: Date.now().toString(), allergen: newAllergen, reaction: newReaction, severity: newSeverity }
    ];
    try {
      const res = await fetch(`${apiUrl}/profiles/me`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ allergies: updated })
      });
      const data = await res.json();
      if (res.ok) {
        setProfile(data.profile);
        setShowAllergyModal(false);
        setNewAllergen('');
        setNewReaction('');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleDeleteAllergy = async (allergenId: string) => {
    const updated = (profile?.allergies || []).filter((a: any) => a.id !== allergenId);
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

  // Add Medication
  const handleAddMed = async () => {
    if (!newMedName.trim()) return Alert.alert('Required', 'Please enter medication name.');
    const updated = [
      ...(profile?.medications || []),
      { id: Date.now().toString(), name: newMedName, dosage: newMedDosage, frequency: newMedFreq }
    ];
    try {
      const res = await fetch(`${apiUrl}/profiles/me`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ medications: updated })
      });
      const data = await res.json();
      if (res.ok) {
        setProfile(data.profile);
        setShowMedModal(false);
        setNewMedName('');
        setNewMedDosage('');
        setNewMedFreq('');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleDeleteMed = async (medId: string) => {
    const updated = (profile?.medications || []).filter((m: any) => m.id !== medId);
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

  // Add Chronic Condition
  const handleAddCondition = async () => {
    if (!newCondName.trim()) return Alert.alert('Required', 'Please enter condition name.');
    const updated = [
      ...(profile?.conditions || []),
      { id: Date.now().toString(), name: newCondName }
    ];
    try {
      const res = await fetch(`${apiUrl}/profiles/me`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ conditions: updated })
      });
      const data = await res.json();
      if (res.ok) {
        setProfile(data.profile);
        setShowCondModal(false);
        setNewCondName('');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleDeleteCondition = async (condId: string) => {
    const updated = (profile?.conditions || []).filter((c: any) => c.id !== condId);
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

  // Add Surgery
  const handleAddSurgery = async () => {
    if (!newSurgeryProcedure.trim()) return Alert.alert('Required', 'Please enter procedure.');
    const updated = [
      ...(profile?.surgeries || []),
      { id: Date.now().toString(), procedure: newSurgeryProcedure, year: newSurgeryYear }
    ];
    try {
      const res = await fetch(`${apiUrl}/profiles/me`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ surgeries: updated })
      });
      const data = await res.json();
      if (res.ok) {
        setProfile(data.profile);
        setShowSurgeryModal(false);
        setNewSurgeryProcedure('');
        setNewSurgeryYear('');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleDeleteSurgery = async (surgId: string) => {
    const updated = (profile?.surgeries || []).filter((s: any) => s.id !== surgId);
    try {
      const res = await fetch(`${apiUrl}/profiles/me`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ surgeries: updated })
      });
      const data = await res.json();
      if (res.ok) setProfile(data.profile);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  // Add Medical Device / Implant
  const handleAddDevice = async () => {
    if (!newDeviceName.trim()) return Alert.alert('Required', 'Please enter device name.');
    const updated = [
      ...(profile?.devices || []),
      { id: Date.now().toString(), name: newDeviceName, details: newDeviceDetails }
    ];
    try {
      const res = await fetch(`${apiUrl}/profiles/me`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ devices: updated })
      });
      const data = await res.json();
      if (res.ok) {
        setProfile(data.profile);
        setShowDeviceModal(false);
        setNewDeviceName('');
        setNewDeviceDetails('');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleDeleteDevice = async (devId: string) => {
    const updated = (profile?.devices || []).filter((d: any) => d.id !== devId);
    try {
      const res = await fetch(`${apiUrl}/profiles/me`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ devices: updated })
      });
      const data = await res.json();
      if (res.ok) setProfile(data.profile);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  // Emergency Contacts Handlers
  const handleAddContact = async () => {
    if (!newContactName.trim() || !newContactPhone.trim()) {
      return Alert.alert('Required', 'Contact name and phone number are required.');
    }
    try {
      const res = await fetch(`${apiUrl}/profiles/me/contacts`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newContactName.trim(),
          relationship: newContactRel,
          phone: newContactPhone.trim(),
          priority_order: contacts.length + 1
        })
      });
      const data = await res.json();
      if (res.ok) {
        setShowContactModal(false);
        setNewContactName('');
        setNewContactPhone('');
        if (token) fetchProfile(token, apiUrl);
      } else {
        Alert.alert('Error', data.error || 'Failed to add contact');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    Alert.alert('Delete Contact', 'Are you sure you want to remove this emergency contact?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await fetch(`${apiUrl}/profiles/me/contacts/${contactId}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
              setContacts(contacts.filter(c => c.id !== contactId));
            }
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        }
      }
    ]);
  };

  // ==========================================
  // FAMILY LINKING HUB HANDLERS
  // ==========================================

  // Accept incoming family link request
  const handleAcceptFamilyRequest = async (relId: string) => {
    try {
      const res = await fetch(`${apiUrl}/family/requests/${relId}/accept`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (res.ok) {
        Alert.alert('Accepted', 'Family link approved! You are now interconnected in each other’s emergency networks.');
        if (token) fetchProfile(token, apiUrl);
      } else {
        Alert.alert('Error', data.error || 'Failed to accept request');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  // Decline incoming family link request
  const handleDeclineFamilyRequest = async (relId: string) => {
    try {
      const res = await fetch(`${apiUrl}/family/requests/${relId}/decline`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      if (res.ok) {
        Alert.alert('Declined', 'Family request was declined.');
        if (token) fetchProfile(token, apiUrl);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  // Add Dependent Profile (child/senior with dedicated QR code)
  const handleCreateDependent = async () => {
    if (!depName.trim()) {
      return Alert.alert('Required', 'Please enter dependent full name.');
    }
    try {
      const res = await fetch(`${apiUrl}/family/dependent`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: depName.trim(),
          relationship_type: depRel,
          date_of_birth: depDob || null,
          blood_group: depBlood,
          emergency_notes: depNotes || null
        })
      });
      const data = await res.json();
      if (res.ok) {
        setShowDependentModal(false);
        setDepName('');
        setDepNotes('');
        setDepDob('');
        if (token) fetchProfile(token, apiUrl);
        Alert.alert('Dependent Enrolled', `${data.dependent?.full_name || 'Dependent'} enrolled with dedicated emergency QR code!`);
      } else {
        Alert.alert('Error', data.error || 'Failed to enroll dependent');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  // Invite Adult Family Member (invitation via email/SMS)
  const handleSendInvite = async () => {
    if (!invName.trim() || (!invEmail.trim() && !invPhone.trim())) {
      return Alert.alert('Required', 'Full Name and Email or Phone number are required.');
    }
    try {
      const res = await fetch(`${apiUrl}/family/invite`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: invName.trim(),
          relationship_type: invRel,
          email: invEmail.trim() || null,
          phone: invPhone.trim() || null
        })
      });
      const data = await res.json();
      if (res.ok) {
        setShowInviteModal(false);
        setInvName('');
        setInvEmail('');
        setInvPhone('');
        if (token) fetchProfile(token, apiUrl);
        Alert.alert('Invitation Dispatched', `Emergency network invite dispatched to ${invEmail || invPhone}.`);
      } else {
        Alert.alert('Error', data.error || 'Failed to send invite');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  // Link Existing EMP User Account (by email)
  const handleLinkExisting = async () => {
    if (!linkEmail.trim()) {
      return Alert.alert('Required', 'Please enter the email of the registered EMP user.');
    }
    try {
      const res = await fetch(`${apiUrl}/family/link-request`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_email: linkEmail.trim(),
          relationship_type: linkRel
        })
      });
      const data = await res.json();
      if (res.ok) {
        setShowLinkModal(false);
        setLinkEmail('');
        if (token) fetchProfile(token, apiUrl);
        Alert.alert('Link Request Sent', data.message || 'Link request dispatched for authorization.');
      } else {
        Alert.alert('Error', data.error || 'Failed to send link request');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  // Open Permissions Modal for Family Member
  const openPermissionsModal = (member: any) => {
    setShowPermissionsModal(member);
    setPermAlerts(member.permissions?.receive_alerts ?? true);
    setPermMedical(member.permissions?.can_view_medical ?? false);
    setPermManageQR(member.permissions?.can_manage_qr ?? member.is_dependent);
  };

  // Save Permissions
  const handleSavePermissions = async () => {
    if (!showPermissionsModal) return;
    const relId = showPermissionsModal.relationship_id || showPermissionsModal.id;
    try {
      const res = await fetch(`${apiUrl}/family/${relId}/permissions`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receive_alerts: permAlerts,
          can_view_medical: permMedical,
          can_manage_qr: permManageQR
        })
      });
      if (res.ok) {
        setShowPermissionsModal(null);
        if (token) fetchProfile(token, apiUrl);
        Alert.alert('Saved', 'Family emergency permissions updated.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  // Unlink Family Member (Safe: Personal accounts are NOT deleted)
  const handleDeleteFamily = async (relId: string) => {
    Alert.alert(
      'Unlink Family Member?',
      'Their personal account, independent QR badge, and medical records will NOT be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlink',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(`${apiUrl}/family/${relId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
              });
              if (res.ok) {
                setFamilyMembers(familyMembers.filter(f => (f.relationship_id || f.id) !== relId));
                Alert.alert('Unlinked', 'Family relationship removed.');
              }
            } catch (e: any) {
              Alert.alert('Error', e.message);
            }
          }
        }
      ]
    );
  };

  // ==========================================
  // ORGANIZATION MEMBERSHIP HANDLERS
  // ==========================================

  const handleJoinOrganization = async () => {
    if (!joinCompanyCode.trim()) {
      return Alert.alert('Required', 'Please enter Company Code (e.g. apex or company slug).');
    }
    setOrgLoading(true);
    try {
      const res = await fetch(`${apiUrl}/organization/join`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_code: joinCompanyCode.trim(),
          employee_id_number: joinEmployeeId.trim() || undefined,
          department: joinDepartment.trim() || undefined
        })
      });
      const data = await res.json();
      if (res.ok) {
        setShowJoinOrgModal(false);
        setJoinCompanyCode('');
        setJoinEmployeeId('');
        setJoinDepartment('');
        if (token) fetchProfile(token, apiUrl);
        Alert.alert('Organization Enrolled!', data.message || 'You have successfully joined the company duty-of-care network.');
      } else {
        Alert.alert('Join Failed', data.error || 'Failed to join organization. Please verify company code.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setOrgLoading(false);
    }
  };

  const handleLeaveOrganization = async () => {
    Alert.alert(
      'Leave Organization?',
      'Leaving your employer reverts your account to an Independent Account. Your personal medical profile, emergency contacts, and personal QR badge will remain 100% active and untouched.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave Employer',
          style: 'destructive',
          onPress: async () => {
            setOrgLoading(true);
            try {
              const res = await fetch(`${apiUrl}/organization/leave`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({})
              });
              const data = await res.json();
              if (res.ok) {
                if (token) fetchProfile(token, apiUrl);
                Alert.alert('Organization Left', data.message);
              } else {
                Alert.alert('Error', data.error || 'Failed to leave organization');
              }
            } catch (e: any) {
              Alert.alert('Error', e.message);
            } finally {
              setOrgLoading(false);
            }
          }
        }
      ]
    );
  };

  // ==========================================
  // SCANNER SIMULATOR HANDLERS
  // ==========================================

  const loadScanPreview = async (tok: string) => {
    if (!tok) return;
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
        body: JSON.stringify({ location_address: 'GPS Verified Location (Mobile Simulator)' })
      });
      const data = await res.json();
      if (res.ok) {
        setAlertDispatched(true);
        Alert.alert('EMERGENCY ALERT SENT', `Alert dispatched to family & emergency desk!\nIncident Code: ${data.incident_code}`);
        if (token) fetchProfile(token, apiUrl);
      }
    } catch (e: any) {
      Alert.alert('Alert Failed', e.message);
    }
  };

  // 1-Tap Client-Side Native Messaging Channels
  const triggerNativeCall = (phone: string) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`);
  };

  const triggerNativeWhatsApp = (phone: string, name: string) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const msg = `🚨 URGENT MEDICAL EMERGENCY: An emergency scan has occurred for ${scanData?.display_name || profile?.full_name || 'an EMP user'}. Please check immediately!`;
    Linking.openURL(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`);
  };

  const triggerNativeSMS = (phone: string) => {
    if (!phone) return;
    const msg = `🚨 URGENT MEDICAL EMERGENCY: Emergency scan recorded for ${scanData?.display_name || profile?.full_name || 'an EMP user'}.`;
    Linking.openURL(`sms:${phone.replace(/\s+/g, '')}${Platform.OS === 'ios' ? '&' : '?'}body=${encodeURIComponent(msg)}`);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <ActivityIndicator size="large" color="#DC2626" />
        <Text style={{ marginTop: 12, color: '#94A3B8', fontWeight: '600' }}>Initializing EMP Mobile...</Text>
      </View>
    );
  }

  // ==========================================
  // 1. AUTH SCREEN (Sign In & Direct Registration)
  // ==========================================
  if (!token) {
    return (
      <View style={[styles.authContainer, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" translucent backgroundColor="#0F172A" />
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 36 }}>
          <View style={{ alignItems: 'center', marginTop: 16, marginBottom: 24 }}>
            <View style={styles.logoBadge}>
              <Text style={{ color: '#FFFFFF', fontSize: 28, fontWeight: '900' }}>+</Text>
            </View>
            <Text style={styles.appTitle}>EMP Commercial</Text>
            <Text style={styles.appSubtitle}>Emergency Medical Portal • Mobile App</Text>
          </View>

          {/* Mode Switcher: Sign In vs Create Account */}
          <View style={styles.authModeSwitcher}>
            <TouchableOpacity
              style={[styles.authModeBtn, authMode === 'login' && styles.authModeBtnActive]}
              onPress={() => setAuthMode('login')}
            >
              <Text style={[styles.authModeText, authMode === 'login' && styles.authModeTextActive]}>
                Sign In
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.authModeBtn, authMode === 'register' && styles.authModeBtnActive]}
              onPress={() => setAuthMode('register')}
            >
              <Text style={[styles.authModeText, authMode === 'register' && styles.authModeTextActive]}>
                Create Account
              </Text>
            </TouchableOpacity>
          </View>

          {/* Quick Demo Login Preset Buttons (Only shown in Sign In mode) */}
          {authMode === 'login' && (
            <View style={styles.demoBox}>
              <Text style={styles.demoTitle}>Instant Demo Account:</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
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
                <TouchableOpacity
                  style={styles.demoBtn}
                  onPress={() => login('superadmin@emp.com', 'Admin@123')}
                >
                  <Text style={styles.demoBtnText}>Super Admin</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Info Banner for Independent Registration */}
          {authMode === 'register' && (
            <View style={styles.registerInfoBanner}>
              <Text style={{ color: '#2DD4BF', fontWeight: '800', fontSize: 13, marginBottom: 2 }}>
                ✨ Direct Independent Registration
              </Text>
              <Text style={{ color: '#94A3B8', fontSize: 11.5, lineHeight: 16 }}>
                No HR invitation needed. Anyone can register independently, manage personal & family emergency medical profiles, and join a company anytime later.
              </Text>
            </View>
          )}

          {/* Form */}
          <View style={{ gap: 12 }}>
            {authMode === 'register' && (
              <>
                <View>
                  <Text style={styles.inputLabel}>Full Name *</Text>
                  <TextInput
                    style={styles.input}
                    value={regFullName}
                    onChangeText={setRegFullName}
                    placeholder="e.g. Rahul Sharma"
                    placeholderTextColor="#64748B"
                  />
                </View>

                <View>
                  <Text style={styles.inputLabel}>Account Role / Profile Type *</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                    {[
                      { role: 'employee', label: '👤 Employee' },
                      { role: 'student', label: '🎓 Student' },
                      { role: 'individual', label: '🏠 Independent' },
                      { role: 'company_admin', label: '🏢 HR Admin' }
                    ].map(item => (
                      <TouchableOpacity
                        key={item.role}
                        onPress={() => setRegRole(item.role as any)}
                        style={[
                          styles.roleChip,
                          regRole === item.role && styles.roleChipActive
                        ]}
                      >
                        <Text style={[styles.roleChipText, regRole === item.role && styles.roleChipTextActive]}>
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {regRole === 'company_admin' && (
                  <View>
                    <Text style={styles.inputLabel}>Organization / Company Name *</Text>
                    <TextInput
                      style={styles.input}
                      value={regOrgName}
                      onChangeText={setRegOrgName}
                      placeholder="e.g. Apex Global Technologies"
                      placeholderTextColor="#64748B"
                    />
                  </View>
                )}

                <View>
                  <Text style={styles.inputLabel}>Mobile Phone (with country code)</Text>
                  <TextInput
                    style={styles.input}
                    value={regPhone}
                    onChangeText={setRegPhone}
                    placeholder="+91 98765 43210"
                    placeholderTextColor="#64748B"
                    keyboardType="phone-pad"
                  />
                </View>
              </>
            )}

            <View>
              <Text style={styles.inputLabel}>{authMode === 'login' ? 'Work or Personal Email' : 'Email Address *'}</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="name@example.com"
                placeholderTextColor="#64748B"
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View>
              <Text style={styles.inputLabel}>Password *</Text>
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
              style={[styles.loginBtn, authMode === 'register' && { backgroundColor: '#0D9488' }]}
              onPress={() => (authMode === 'login' ? login() : handleRegister())}
              disabled={authLoading}
            >
              {authLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.loginBtnText}>
                  {authMode === 'login' ? 'Sign In to EMP App' : 'Create Free EMP Account'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Server Config Link */}
          <TouchableOpacity
            style={{ alignItems: 'center', marginTop: 24 }}
            onPress={() => setShowConfigModal(true)}
          >
            <Text style={{ color: '#2DD4BF', fontSize: 12, fontWeight: '600' }}>
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
                Enter your development computer's local IP (port 5000) or leave default for live Vercel cloud:
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

  // ==========================================
  // 2. MAIN APP VIEW
  // ==========================================
  const isEnrolledInOrg = orgStatus?.is_enrolled && orgStatus?.organization;
  const currentOrg = orgStatus?.organization;

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
              <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 15 }}>EMP Emergency</Text>
              <Text style={{ color: '#2DD4BF', fontSize: 11, fontWeight: '600' }}>
                {profile?.full_name || user?.full_name || 'Individual Account'}
                {isEnrolledInOrg ? ` • ${currentOrg.name}` : ' • Independent'}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <TouchableOpacity
              onPress={() => setShowConfigModal(true)}
              style={[styles.logoutBtn, { borderColor: '#0D9488' }]}
            >
              <Text style={{ color: '#2DD4BF', fontSize: 11, fontWeight: '700' }}>⚙️ Host</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
              <Text style={{ color: '#CBD5E1', fontSize: 11, fontWeight: '600' }}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Screen Body */}
      <ScrollView contentContainerStyle={[styles.screenContent, { paddingBottom: scrollBottomPadding }]}>
        {/* ========================================================= */}
        {/* TAB 1: HOME */}
        {/* ========================================================= */}
        {activeTab === 'home' && (
          <View style={{ gap: 14 }}>
            {/* 1. Dynamic Organization / Corporate Duty-of-Care Hotline Banner */}
            {isEnrolledInOrg ? (
              <View style={[styles.card, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={{ color: '#991B1B', fontWeight: '800', fontSize: 12 }}>
                      🏢 {currentOrg.name.toUpperCase()} 24/7 MEDICAL DESK
                    </Text>
                    <Text style={{ color: '#7F1D1D', fontSize: 11.5, marginTop: 2 }}>
                      Hotline: {currentOrg.emergency_phone || '+91 1800 223 456'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.callIconBtn, { backgroundColor: '#DC2626' }]}
                    onPress={() => triggerNativeCall(currentOrg.emergency_phone || '+911800223456')}
                  >
                    <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 12 }}>📞 CALL</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={[styles.card, { backgroundColor: '#F0FDFA', borderColor: '#CCFBF1' }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={{ color: '#0F766E', fontWeight: '800', fontSize: 12 }}>
                      👤 INDEPENDENT ACCOUNT (NO EMPLOYER LINKED)
                    </Text>
                    <Text style={{ color: '#115E59', fontSize: 11, marginTop: 2 }}>
                      You own your medical data & QR badge. You can join your company anytime.
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.callIconBtn, { backgroundColor: '#0D9488' }]}
                    onPress={() => setShowJoinOrgModal(true)}
                  >
                    <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 11 }}>+ JOIN ORG</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* 2. Pending Family Link Requests Alert Banner */}
            {pendingFamilyRequests.length > 0 && (
              <View style={[styles.card, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
                <Text style={{ color: '#92400E', fontWeight: '800', fontSize: 13, marginBottom: 4 }}>
                  📥 Incoming Family Link Requests ({pendingFamilyRequests.length})
                </Text>
                <Text style={{ color: '#78350F', fontSize: 11.5, marginBottom: 10 }}>
                  A family member requested to link your emergency medical profiles:
                </Text>
                {pendingFamilyRequests.map((req: any) => (
                  <View key={req.id} style={{ backgroundColor: '#FFFFFF', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#FDE68A', marginBottom: 6 }}>
                    <Text style={{ fontWeight: '800', color: '#0F172A', fontSize: 13 }}>
                      {req.sponsor_name || req.sponsor_email} ({req.relationship_type})
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                      <TouchableOpacity
                        onPress={() => handleAcceptFamilyRequest(req.id)}
                        style={[styles.actionBtn, { backgroundColor: '#059669' }]}
                      >
                        <Text style={styles.actionBtnText}>✓ Accept Link</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeclineFamilyRequest(req.id)}
                        style={[styles.actionBtn, { backgroundColor: '#64748B' }]}
                      >
                        <Text style={styles.actionBtnText}>✕ Decline</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* 3. Profile Completion Card */}
            <View style={styles.vitalsCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ color: '#94A3B8', fontSize: 11, fontWeight: '700' }}>PROFILE COMPLETION</Text>
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

            {/* 4. Personal Emergency QR Card */}
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text style={styles.cardTitle}>Emergency Medical QR</Text>
                <View style={[
                  styles.badge,
                  qrToken?.status === 'active' ? styles.badgeActive : qrToken?.status === 'suspended' ? styles.badgeSuspended : styles.badgeRevoked
                ]}>
                  <Text style={[
                    styles.badgeText,
                    qrToken?.status === 'active' ? { color: '#047857' } : qrToken?.status === 'suspended' ? { color: '#B45309' } : { color: '#DC2626' }
                  ]}>
                    {qrToken?.status?.toUpperCase() || 'ACTIVE'}
                  </Text>
                </View>
              </View>

              <View style={{ alignItems: 'center', paddingVertical: 10 }}>
                {qrToken?.status === 'active' && qrToken?.public_token ? (
                  <View style={styles.qrWrapper}>
                    <QRCode
                      value={`https://emp-commercial.vercel.app/e/${qrToken.public_token}`}
                      size={170}
                      color="#0F172A"
                      backgroundColor="#FFFFFF"
                    />
                  </View>
                ) : qrToken?.status === 'suspended' ? (
                  <View style={[styles.qrWrapper, { height: 170, justifyContent: 'center' }]}>
                    <Text style={{ color: '#B45309', fontWeight: '800', fontSize: 14 }}>⚠️ QR SUSPENDED</Text>
                    <Text style={{ color: '#64748B', fontSize: 11, marginTop: 4 }}>Temporarily paused by owner</Text>
                  </View>
                ) : (
                  <View style={[styles.qrWrapper, { height: 170, justifyContent: 'center', backgroundColor: '#FEF2F2' }]}>
                    <Text style={{ color: '#DC2626', fontWeight: '800', fontSize: 14 }}>⛔ QR REVOKED</Text>
                    <Text style={{ color: '#991B1B', fontSize: 11, marginTop: 4 }}>Permanently retired token</Text>
                  </View>
                )}
                <Text style={{ marginTop: 8, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontWeight: '700', color: '#64748B', fontSize: 12 }}>
                  {qrToken?.public_token || 'NO-ACTIVE-TOKEN'}
                </Text>
              </View>

              {/* QR Actions */}
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                {qrToken?.status === 'revoked' ? (
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#0D9488' }]} onPress={handleGenerateQR}>
                    <Text style={styles.actionBtnText}>✨ Generate Fresh QR</Text>
                  </TouchableOpacity>
                ) : (
                  <>
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

                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#991B1B' }]} onPress={handleRevokeQR}>
                      <Text style={styles.actionBtnText}>Revoke</Text>
                    </TouchableOpacity>
                  </>
                )}

                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#0F172A' }]} onPress={() => loadScanPreview(qrToken?.public_token)}>
                  <Text style={styles.actionBtnText}>Test Scan →</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 5. Severe Allergies Quick Glance */}
            {profile?.allergies?.length > 0 && (
              <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: '#DC2626' }]}>
                <Text style={{ color: '#DC2626', fontWeight: '800', fontSize: 12, marginBottom: 4 }}>
                  ⚠️ SEVERE ALLERGIES / ANAPHYLAXIS RISK
                </Text>
                {profile.allergies.map((a: any) => (
                  <Text key={a.id} style={{ color: '#0F172A', fontSize: 12, fontWeight: '600' }}>
                    • {a.allergen}: {a.reaction} ({a.severity})
                  </Text>
                ))}
              </View>
            )}

            {/* 6. Emergency Contacts Quick List */}
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={styles.cardTitle}>Emergency Contacts ({contacts.length})</Text>
                <TouchableOpacity onPress={() => setActiveTab('contacts')}>
                  <Text style={{ color: '#0D9488', fontWeight: '700', fontSize: 12 }}>View All →</Text>
                </TouchableOpacity>
              </View>
              {contacts.map((c: any, i: number) => (
                <View key={c.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: i < contacts.length - 1 ? 1 : 0, borderBottomColor: '#F1F5F9' }}>
                  <View>
                    <Text style={{ fontWeight: '700', color: '#0F172A', fontSize: 13 }}>{c.name}</Text>
                    <Text style={{ color: '#64748B', fontSize: 11 }}>{c.relationship} • {c.phone}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.callIconBtn}
                    onPress={() => triggerNativeCall(c.phone)}
                  >
                    <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 11 }}>CALL</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* 7. Emergency Scan Audit Trail Summary */}
            {incidents.length > 0 && (
              <View style={styles.card}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={styles.cardTitle}>Emergency Incident Log ({incidents.length})</Text>
                </View>
                {incidents.slice(0, 3).map((inc: any) => (
                  <View key={inc.id} style={{ paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontWeight: '800', color: '#0F172A', fontSize: 12 }}>{inc.incident_code}</Text>
                      <Text style={{ color: inc.status === 'acknowledged' ? '#059669' : '#DC2626', fontWeight: '700', fontSize: 11 }}>
                        {inc.status?.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={{ color: '#64748B', fontSize: 11, marginTop: 2 }}>
                      {new Date(inc.triggered_at).toLocaleString()} • {inc.location_address || 'GPS verified'}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ========================================================= */}
        {/* TAB 2: PROFILE (Clinical Medical Data & DPDP Disclosures) */}
        {/* ========================================================= */}
        {activeTab === 'profile' && (
          <View style={{ gap: 14 }}>
            {/* Clinical Vitals */}
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={styles.cardTitle}>Clinical Vitals</Text>
                <TouchableOpacity
                  onPress={() => setShowVitalsModal(true)}
                  style={{ backgroundColor: '#F0FDFA', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#CCFBF1' }}
                >
                  <Text style={{ color: '#0D9488', fontWeight: '700', fontSize: 12 }}>Edit Vitals</Text>
                </TouchableOpacity>
              </View>
              <View style={{ gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: '#64748B', fontSize: 13 }}>Blood Group</Text>
                  <Text style={{ fontWeight: '800', color: '#DC2626', fontSize: 14 }}>{profile?.blood_group || 'O+'}</Text>
                </View>
                <View style={{ marginTop: 4 }}>
                  <Text style={{ color: '#64748B', fontSize: 12 }}>Emergency Notes</Text>
                  <Text style={{ color: '#0F172A', fontSize: 13, marginTop: 2 }}>
                    {profile?.emergency_notes || 'No critical notes logged.'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Allergies */}
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={styles.cardTitle}>Allergies ({profile?.allergies?.length || 0})</Text>
                <TouchableOpacity onPress={() => setShowAllergyModal(true)} style={{ backgroundColor: '#0D9488', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
                  <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 11 }}>+ Add</Text>
                </TouchableOpacity>
              </View>
              {(profile?.allergies || []).map((a: any) => (
                <View key={a.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                  <View>
                    <Text style={{ fontWeight: '700', color: '#0F172A', fontSize: 13 }}>{a.allergen}</Text>
                    <Text style={{ color: '#64748B', fontSize: 11 }}>{a.reaction} • {a.severity}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDeleteAllergy(a.id)}>
                    <Text style={{ color: '#EF4444', fontSize: 12 }}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Medications */}
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={styles.cardTitle}>Medications ({profile?.medications?.length || 0})</Text>
                <TouchableOpacity onPress={() => setShowMedModal(true)} style={{ backgroundColor: '#0D9488', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
                  <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 11 }}>+ Add</Text>
                </TouchableOpacity>
              </View>
              {(profile?.medications || []).map((m: any) => (
                <View key={m.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                  <View>
                    <Text style={{ fontWeight: '700', color: '#0F172A', fontSize: 13 }}>{m.name}</Text>
                    <Text style={{ color: '#64748B', fontSize: 11 }}>{m.dosage} • {m.frequency}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDeleteMed(m.id)}>
                    <Text style={{ color: '#EF4444', fontSize: 12 }}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Chronic Conditions */}
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={styles.cardTitle}>Chronic Conditions ({profile?.conditions?.length || 0})</Text>
                <TouchableOpacity onPress={() => setShowCondModal(true)} style={{ backgroundColor: '#0D9488', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
                  <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 11 }}>+ Add</Text>
                </TouchableOpacity>
              </View>
              {(profile?.conditions || []).map((c: any) => (
                <View key={c.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                  <Text style={{ fontWeight: '700', color: '#0F172A', fontSize: 13 }}>{c.name}</Text>
                  <TouchableOpacity onPress={() => handleDeleteCondition(c.id)}>
                    <Text style={{ color: '#EF4444', fontSize: 12 }}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Surgeries */}
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={styles.cardTitle}>Surgeries & Procedures ({profile?.surgeries?.length || 0})</Text>
                <TouchableOpacity onPress={() => setShowSurgeryModal(true)} style={{ backgroundColor: '#0D9488', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
                  <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 11 }}>+ Add</Text>
                </TouchableOpacity>
              </View>
              {(profile?.surgeries || []).map((s: any) => (
                <View key={s.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                  <View>
                    <Text style={{ fontWeight: '700', color: '#0F172A', fontSize: 13 }}>{s.procedure}</Text>
                    <Text style={{ color: '#64748B', fontSize: 11 }}>Year: {s.year || 'N/A'}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDeleteSurgery(s.id)}>
                    <Text style={{ color: '#EF4444', fontSize: 12 }}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Implants & Medical Devices */}
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={styles.cardTitle}>Implants / Devices ({profile?.devices?.length || 0})</Text>
                <TouchableOpacity onPress={() => setShowDeviceModal(true)} style={{ backgroundColor: '#0D9488', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
                  <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 11 }}>+ Add</Text>
                </TouchableOpacity>
              </View>
              {(profile?.devices || []).map((d: any) => (
                <View key={d.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                  <View>
                    <Text style={{ fontWeight: '700', color: '#0F172A', fontSize: 13 }}>{d.name}</Text>
                    <Text style={{ color: '#64748B', fontSize: 11 }}>{d.details || 'No details'}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDeleteDevice(d.id)}>
                    <Text style={{ color: '#EF4444', fontSize: 12 }}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* DPDP Act 2023 Consent Disclosures */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>DPDP Privacy Disclosures</Text>
              <Text style={{ color: '#64748B', fontSize: 11, marginTop: 2, marginBottom: 10 }}>
                Control which medical sections are shown on your public emergency QR scan page:
              </Text>
              {[
                { key: 'blood_group', label: 'Disclose Blood Group to Scanner' },
                { key: 'allergies', label: 'Disclose Severe Allergies' },
                { key: 'medications', label: 'Disclose Current Medications' },
                { key: 'conditions', label: 'Disclose Chronic Conditions' },
                { key: 'devices', label: 'Disclose Medical Devices / Implants' },
                { key: 'emergency_notes', label: 'Disclose Paramedic Notes' }
              ].map(item => (
                <View key={item.key} style={styles.switchRow}>
                  <Text style={{ flex: 1, fontSize: 12.5, color: '#0F172A', fontWeight: '600' }}>{item.label}</Text>
                  <Switch
                    value={profile?.public_disclosures?.[item.key] ?? true}
                    onValueChange={() => toggleDisclosure(item.key)}
                    trackColor={{ false: '#CBD5E1', true: '#2DD4BF' }}
                    thumbColor={profile?.public_disclosures?.[item.key] ?? true ? '#0D9488' : '#F1F5F9'}
                  />
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ========================================================= */}
        {/* TAB 3: DEDICATED QR CODE LIFECYCLE */}
        {/* ========================================================= */}
        {activeTab === 'qr' && (
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.cardTitle}>Emergency QR Badge</Text>
              <View style={[
                styles.badge,
                qrToken?.status === 'active' ? styles.badgeActive : qrToken?.status === 'suspended' ? styles.badgeSuspended : styles.badgeRevoked
              ]}>
                <Text style={[
                  styles.badgeText,
                  qrToken?.status === 'active' ? { color: '#047857' } : qrToken?.status === 'suspended' ? { color: '#B45309' } : { color: '#DC2626' }
                ]}>
                  {qrToken?.status?.toUpperCase() || 'ACTIVE'}
                </Text>
              </View>
            </View>

            <Text style={{ color: '#64748B', fontSize: 12, marginTop: 4 }}>
              Print this code onto an ID badge, helmet sticker, or wallet card.
            </Text>

            <View style={{ alignItems: 'center', marginVertical: 20 }}>
              {qrToken?.status === 'active' && qrToken?.public_token ? (
                <View style={[styles.qrWrapper, { padding: 16 }]}>
                  <QRCode
                    value={`https://emp-commercial.vercel.app/e/${qrToken.public_token}`}
                    size={220}
                    color="#0F172A"
                    backgroundColor="#FFFFFF"
                  />
                </View>
              ) : qrToken?.status === 'suspended' ? (
                <View style={[styles.qrWrapper, { height: 220, justifyContent: 'center' }]}>
                  <Text style={{ color: '#B45309', fontWeight: '800', fontSize: 16 }}>QR SUSPENDED</Text>
                  <Text style={{ color: '#64748B', fontSize: 12, marginTop: 6, textAlign: 'center', paddingHorizontal: 20 }}>
                    Emergency scanning is temporarily disabled. Tap Reactivate below to restore.
                  </Text>
                </View>
              ) : (
                <View style={[styles.qrWrapper, { height: 220, justifyContent: 'center', backgroundColor: '#FEF2F2' }]}>
                  <Text style={{ color: '#DC2626', fontWeight: '800', fontSize: 16 }}>⛔ QR REVOKED</Text>
                  <Text style={{ color: '#991B1B', fontSize: 12, marginTop: 6, textAlign: 'center', paddingHorizontal: 20 }}>
                    This QR code was permanently revoked. Tap Generate Fresh QR to activate a new code.
                  </Text>
                </View>
              )}

              <Text style={{ marginTop: 12, fontWeight: '800', fontSize: 16, color: '#0F172A' }}>
                {qrToken?.public_token || 'NO-ACTIVE-TOKEN'}
              </Text>
              <Text style={{ color: '#64748B', fontSize: 12, marginTop: 2 }}>
                Total Scans Recorded: {qrToken?.scan_count || 0}
              </Text>
            </View>

            {/* QR Lifecycle Buttons */}
            <View style={{ gap: 8 }}>
              {qrToken?.status === 'revoked' ? (
                <TouchableOpacity style={[styles.loginBtn, { backgroundColor: '#0D9488' }]} onPress={handleGenerateQR}>
                  <Text style={styles.loginBtnText}>✨ Generate Fresh QR Code</Text>
                </TouchableOpacity>
              ) : (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {qrToken?.status === 'suspended' ? (
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#0D9488', paddingVertical: 12 }]} onPress={handleReactivateQR}>
                      <Text style={styles.actionBtnText}>Reactivate</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#475569', paddingVertical: 12 }]} onPress={handleSuspendQR}>
                      <Text style={styles.actionBtnText}>Suspend</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#DC2626', paddingVertical: 12 }]} onPress={handleRegenerateQR}>
                    <Text style={styles.actionBtnText}>Regenerate</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#991B1B', paddingVertical: 12 }]} onPress={handleRevokeQR}>
                    <Text style={styles.actionBtnText}>Revoke</Text>
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity
                style={[styles.loginBtn, { backgroundColor: '#0F172A', marginTop: 4 }]}
                onPress={() => loadScanPreview(qrToken?.public_token)}
              >
                <Text style={styles.loginBtnText}>Test Public Scanner Page →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ========================================================= */}
        {/* TAB 4: FAMILY LINKING HUB */}
        {/* ========================================================= */}
        {activeTab === 'family' && (
          <View style={{ gap: 14 }}>
            {/* Pending Requests Banner */}
            {pendingFamilyRequests.length > 0 && (
              <View style={[styles.card, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
                <Text style={{ color: '#92400E', fontWeight: '800', fontSize: 13, marginBottom: 4 }}>
                  📥 Incoming Family Link Requests ({pendingFamilyRequests.length})
                </Text>
                {pendingFamilyRequests.map((req: any) => (
                  <View key={req.id} style={{ backgroundColor: '#FFFFFF', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#FDE68A', marginTop: 6 }}>
                    <Text style={{ fontWeight: '800', color: '#0F172A', fontSize: 13 }}>
                      {req.sponsor_name || req.sponsor_email} ({req.relationship_type})
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                      <TouchableOpacity
                        onPress={() => handleAcceptFamilyRequest(req.id)}
                        style={[styles.actionBtn, { backgroundColor: '#059669' }]}
                      >
                        <Text style={styles.actionBtnText}>✓ Accept</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeclineFamilyRequest(req.id)}
                        style={[styles.actionBtn, { backgroundColor: '#64748B' }]}
                      >
                        <Text style={styles.actionBtnText}>✕ Decline</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Header and 3 Family Hub Actions */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Family Linking Hub</Text>
              <Text style={{ color: '#64748B', fontSize: 12, marginTop: 2, marginBottom: 12 }}>
                Link independent adult family accounts or add dependent children with dedicated QR badges.
              </Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <TouchableOpacity
                  onPress={() => setShowLinkModal(true)}
                  style={[styles.actionBtn, { backgroundColor: '#0F172A', paddingVertical: 10 }]}
                >
                  <Text style={[styles.actionBtnText, { fontSize: 11 }]}>🔗 Link Account</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setShowInviteModal(true)}
                  style={[styles.actionBtn, { backgroundColor: '#0284C7', paddingVertical: 10 }]}
                >
                  <Text style={[styles.actionBtnText, { fontSize: 11 }]}>✉️ Invite Adult</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setShowDependentModal(true)}
                  style={[styles.actionBtn, { backgroundColor: '#0D9488', paddingVertical: 10 }]}
                >
                  <Text style={[styles.actionBtnText, { fontSize: 11 }]}>➕ Add Dependent</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Family Members List */}
            <View style={{ gap: 10 }}>
              <Text style={{ fontWeight: '800', fontSize: 14, color: '#0F172A', paddingHorizontal: 4 }}>
                Connected Family Members ({familyMembers.length})
              </Text>

              {familyMembers.length === 0 ? (
                <View style={[styles.card, { alignItems: 'center', paddingVertical: 24 }]}>
                  <Text style={{ color: '#64748B', fontSize: 13 }}>No family members connected yet.</Text>
                  <Text style={{ color: '#94A3B8', fontSize: 11, marginTop: 4 }}>
                    Use the buttons above to link your spouse, parents, or dependents.
                  </Text>
                </View>
              ) : (
                familyMembers.map((member: any) => {
                  const relId = member.relationship_id || member.id;
                  const isPending = member.invitation_status === 'pending_approval' || member.invitation_status === 'pending_invite';
                  return (
                    <View key={relId} style={styles.card}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontWeight: '800', fontSize: 14, color: '#0F172A' }}>
                            {member.full_name || member.invite_email || 'Family Member'}
                          </Text>
                          <Text style={{ color: '#64748B', fontSize: 11.5, marginTop: 2 }}>
                            {member.relationship_type} • {member.is_dependent ? 'Dependent Profile' : 'Independent Account'}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View style={[
                            styles.badge,
                            member.invitation_status === 'active' ? styles.badgeActive : styles.badgeSuspended
                          ]}>
                            <Text style={[
                              styles.badgeText,
                              member.invitation_status === 'active' ? { color: '#047857' } : { color: '#B45309' }
                            ]}>
                              {member.invitation_status === 'active' ? 'Active' : member.invitation_status === 'pending_approval' ? 'Pending Approval' : 'Invite Sent'}
                            </Text>
                          </View>
                          <TouchableOpacity onPress={() => openPermissionsModal(member)} style={{ padding: 4 }}>
                            <Text style={{ fontSize: 14 }}>⚙️</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleDeleteFamily(relId)} style={{ padding: 4 }}>
                            <Text style={{ color: '#EF4444', fontSize: 14 }}>🗑️</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Token Preview */}
                      {member.public_token && (
                        <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 11.5, color: '#475569', fontWeight: '700' }}>
                            Token: {member.public_token}
                          </Text>
                          <TouchableOpacity
                            onPress={() => loadScanPreview(member.public_token)}
                            style={{ backgroundColor: '#F0FDFA', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#CCFBF1' }}
                          >
                            <Text style={{ color: '#0D9488', fontWeight: '700', fontSize: 11 }}>View QR</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          </View>
        )}

        {/* ========================================================= */}
        {/* TAB 5: ORGANIZATION & DUTY-OF-CARE */}
        {/* ========================================================= */}
        {activeTab === 'org' && (
          <View style={{ gap: 14 }}>
            {isEnrolledInOrg ? (
              <>
                <View style={[styles.card, { backgroundColor: '#F8FAFC', borderColor: '#CBD5E1' }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View>
                      <Text style={styles.cardTitle}>{currentOrg.name}</Text>
                      <Text style={{ color: '#0D9488', fontWeight: '700', fontSize: 12, marginTop: 2 }}>
                        Corporate Duty-of-Care Enrolled
                      </Text>
                    </View>
                    <View style={[styles.badge, styles.badgeActive]}>
                      <Text style={[styles.badgeText, { color: '#047857' }]}>ENROLLED</Text>
                    </View>
                  </View>

                  <View style={{ marginTop: 14, gap: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: '#64748B', fontSize: 12 }}>Organization Identifier:</Text>
                      <Text style={{ fontWeight: '700', color: '#0F172A', fontSize: 12 }}>{currentOrg.slug || currentOrg.id}</Text>
                    </View>
                    {orgStatus?.membership?.department && (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ color: '#64748B', fontSize: 12 }}>Department:</Text>
                        <Text style={{ fontWeight: '700', color: '#0F172A', fontSize: 12 }}>{orgStatus.membership.department}</Text>
                      </View>
                    )}
                    {orgStatus?.membership?.employee_id_number && (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ color: '#64748B', fontSize: 12 }}>Employee ID:</Text>
                        <Text style={{ fontWeight: '700', color: '#0F172A', fontSize: 12 }}>{orgStatus.membership.employee_id_number}</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* 24/7 Corporate Medical Desk */}
                <View style={[styles.card, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                  <Text style={{ color: '#991B1B', fontWeight: '800', fontSize: 13, marginBottom: 4 }}>
                    24/7 Corporate Emergency Hotline
                  </Text>
                  <Text style={{ color: '#7F1D1D', fontSize: 12, marginBottom: 12 }}>
                    Dedicated corporate medical assistance desk: {currentOrg.emergency_phone || '+91 1800 223 456'}
                  </Text>
                  <TouchableOpacity
                    style={[styles.loginBtn, { backgroundColor: '#DC2626', marginTop: 0 }]}
                    onPress={() => triggerNativeCall(currentOrg.emergency_phone || '+911800223456')}
                  >
                    <Text style={styles.loginBtnText}>📞 CALL MEDICAL HOTLINE</Text>
                  </TouchableOpacity>
                </View>

                {/* Leave Organization */}
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Decouple from Organization</Text>
                  <Text style={{ color: '#64748B', fontSize: 12, marginTop: 4, marginBottom: 12 }}>
                    If you change employers, you can decouple safely. Your personal medical profile, emergency contacts, and personal QR token remain 100% active and untouched.
                  </Text>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#EF4444', paddingVertical: 12 }]}
                    onPress={handleLeaveOrganization}
                    disabled={orgLoading}
                  >
                    {orgLoading ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.actionBtnText}>Leave Organization</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Join Employer Organization</Text>
                <Text style={{ color: '#64748B', fontSize: 12, marginTop: 4, marginBottom: 14 }}>
                  Connect your EMP account to your employer's duty-of-care emergency medical desk:
                </Text>

                <View style={{ gap: 10 }}>
                  <View>
                    <Text style={styles.inputLabel}>Company Code or Slug *</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: '#F8FAFC', color: '#0F172A', borderColor: '#CBD5E1' }]}
                      value={joinCompanyCode}
                      onChangeText={setJoinCompanyCode}
                      placeholder="e.g. apex"
                      placeholderTextColor="#94A3B8"
                      autoCapitalize="none"
                    />
                  </View>

                  <View>
                    <Text style={styles.inputLabel}>Employee ID (Optional)</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: '#F8FAFC', color: '#0F172A', borderColor: '#CBD5E1' }]}
                      value={joinEmployeeId}
                      onChangeText={setJoinEmployeeId}
                      placeholder="e.g. EMP-9042"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>

                  <View>
                    <Text style={styles.inputLabel}>Department (Optional)</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: '#F8FAFC', color: '#0F172A', borderColor: '#CBD5E1' }]}
                      value={joinDepartment}
                      onChangeText={setJoinDepartment}
                      placeholder="e.g. Engineering, Sales"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.loginBtn, { backgroundColor: '#0D9488', marginTop: 8 }]}
                    onPress={handleJoinOrganization}
                    disabled={orgLoading}
                  >
                    {orgLoading ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.loginBtnText}>Enroll in Organization</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ========================================================= */}
        {/* TAB 6: CONTACTS */}
        {/* ========================================================= */}
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
                    <Text style={{ fontWeight: '800', color: '#0F172A', fontSize: 14 }}>{c.name}</Text>
                    <Text style={{ color: '#64748B', fontSize: 12, marginTop: 2 }}>{c.relationship} • {c.phone}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <TouchableOpacity
                      style={styles.callIconBtn}
                      onPress={() => triggerNativeCall(c.phone)}
                    >
                      <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 11 }}>CALL</Text>
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

        {/* ========================================================= */}
        {/* TAB 7: PUBLIC SCANNER / FIRST RESPONDER SIMULATOR */}
        {/* ========================================================= */}
        {activeTab === 'scanner' && (
          <View style={{ gap: 14 }}>
            {/* Direct Token Lookup Bar */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Simulate QR Scan (Any Token)</Text>
              <Text style={{ color: '#64748B', fontSize: 11.5, marginTop: 2, marginBottom: 8 }}>
                Test your own, a family dependent's, or any custom QR token:
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
                  <Text style={[styles.loginBtnText, { fontSize: 12 }]}>Lookup</Text>
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

            {/* First Responder View (Zero Login) */}
            <View style={{ backgroundColor: '#7F1D1D', padding: 18, borderRadius: 16, alignItems: 'center' }}>
              <Text style={{ color: '#FEE2E2', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' }}>
                First Responder View (Zero Login)
              </Text>
              <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '900', marginTop: 4 }}>
                {scanData?.display_name || 'Emergency Medical Profile'}
              </Text>

              {scanData?.blood_group && (
                <View style={[styles.bloodBadge, { marginTop: 10, backgroundColor: '#FFFFFF' }]}>
                  <Text style={{ color: '#DC2626', fontSize: 10, fontWeight: '800' }}>BLOOD GROUP</Text>
                  <Text style={{ color: '#DC2626', fontSize: 22, fontWeight: '900' }}>{scanData.blood_group}</Text>
                </View>
              )}
            </View>

            {/* 3 Native Channels for Each Contact (Call, WhatsApp, SMS) */}
            {scanData?.emergency_contacts?.map((c: any) => (
              <View key={c.id} style={styles.card}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <View>
                    <Text style={{ fontWeight: '800', color: '#0F172A', fontSize: 14 }}>{c.name}</Text>
                    <Text style={{ color: '#64748B', fontSize: 11.5 }}>{c.relationship} • {c.phone}</Text>
                  </View>
                </View>

                {/* 3 Instant Free Channels */}
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#059669', paddingVertical: 8 }]}
                    onPress={() => triggerNativeCall(c.phone)}
                  >
                    <Text style={styles.actionBtnText}>📞 Call</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#16A34A', paddingVertical: 8 }]}
                    onPress={() => triggerNativeWhatsApp(c.phone, c.name)}
                  >
                    <Text style={styles.actionBtnText}>💬 WhatsApp</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#0284C7', paddingVertical: 8 }]}
                    onPress={() => triggerNativeSMS(c.phone)}
                  >
                    <Text style={styles.actionBtnText}>✉️ SMS</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {/* SEND EMERGENCY ALERT BUTTON */}
            <View style={[styles.card, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
              <Text style={{ fontWeight: '800', color: '#991B1B', fontSize: 13, textAlign: 'center' }}>
                DIGITAL INCIDENT DISPATCH
              </Text>
              <Text style={{ color: '#7F1D1D', fontSize: 11.5, textAlign: 'center', marginTop: 4, marginBottom: 12 }}>
                Pushes emergency alert across SMS, Email, and In-App notifications with GPS location.
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

      {/* ========================================================= */}
      {/* BOTTOM NAVIGATION BAR */}
      {/* ========================================================= */}
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

        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('org')}>
          <Text style={[styles.navIcon, activeTab === 'org' && styles.navActive]}>🏢</Text>
          <Text style={[styles.navLabel, activeTab === 'org' && styles.navActive]}>Org</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('contacts')}>
          <Text style={[styles.navIcon, activeTab === 'contacts' && styles.navActive]}>📞</Text>
          <Text style={[styles.navLabel, activeTab === 'contacts' && styles.navActive]}>Contacts</Text>
        </TouchableOpacity>
      </View>

      {/* ========================================================= */}
      {/* MODALS */}
      {/* ========================================================= */}

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
                    backgroundColor: editBloodGroup === bg ? '#FEF2F2' : '#F1F5F9',
                    borderWidth: 1,
                    borderColor: editBloodGroup === bg ? '#DC2626' : '#E2E8F0'
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: editBloodGroup === bg ? '#DC2626' : '#0F172A' }}>{bg}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Emergency Notes (Allergies, conditions, implants)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: '#F8FAFC', color: '#0F172A', borderColor: '#CBD5E1', height: 80, textAlignVertical: 'top' }]}
              value={editEmergencyNotes}
              onChangeText={setEditEmergencyNotes}
              placeholder="e.g. Carry EpiPen in backpack. Allergic to Penicillin."
              placeholderTextColor="#94A3B8"
              multiline
            />

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <TouchableOpacity onPress={() => setShowVitalsModal(false)} style={styles.cancelBtn}>
                <Text style={{ color: '#0F172A', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveVitals} style={styles.saveBtn}>
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Save</Text>
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
            <Text style={styles.inputLabel}>Allergen</Text>
            <TextInput
              style={[styles.input, { backgroundColor: '#F8FAFC', color: '#0F172A', borderColor: '#CBD5E1', marginBottom: 10 }]}
              value={newAllergen}
              onChangeText={setNewAllergen}
              placeholder="e.g. Peanuts, Penicillin, Latex"
              placeholderTextColor="#94A3B8"
            />
            <Text style={styles.inputLabel}>Reaction</Text>
            <TextInput
              style={[styles.input, { backgroundColor: '#F8FAFC', color: '#0F172A', borderColor: '#CBD5E1', marginBottom: 10 }]}
              value={newReaction}
              onChangeText={setNewReaction}
              placeholder="e.g. Anaphylaxis, Hives, Swelling"
              placeholderTextColor="#94A3B8"
            />
            <Text style={styles.inputLabel}>Severity</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16 }}>
              {ALLERGY_SEVERITIES.map(sev => (
                <TouchableOpacity
                  key={sev}
                  onPress={() => setNewSeverity(sev)}
                  style={{
                    flex: 1,
                    paddingVertical: 6,
                    borderRadius: 6,
                    backgroundColor: newSeverity === sev ? '#FEF2F2' : '#F1F5F9',
                    borderWidth: 1,
                    borderColor: newSeverity === sev ? '#DC2626' : '#E2E8F0',
                    alignItems: 'center'
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: '700', color: newSeverity === sev ? '#DC2626' : '#0F172A' }}>{sev}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
              <TouchableOpacity onPress={() => setShowAllergyModal(false)} style={styles.cancelBtn}>
                <Text style={{ color: '#0F172A', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAddAllergy} style={styles.saveBtn}>
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: Add Medication */}
      <Modal visible={showMedModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Medication</Text>
            <Text style={styles.inputLabel}>Medication Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: '#F8FAFC', color: '#0F172A', borderColor: '#CBD5E1', marginBottom: 10 }]}
              value={newMedName}
              onChangeText={setNewMedName}
              placeholder="e.g. Metformin, Atorvastatin"
              placeholderTextColor="#94A3B8"
            />
            <Text style={styles.inputLabel}>Dosage</Text>
            <TextInput
              style={[styles.input, { backgroundColor: '#F8FAFC', color: '#0F172A', borderColor: '#CBD5E1', marginBottom: 10 }]}
              value={newMedDosage}
              onChangeText={setNewMedDosage}
              placeholder="e.g. 500mg"
              placeholderTextColor="#94A3B8"
            />
            <Text style={styles.inputLabel}>Frequency</Text>
            <TextInput
              style={[styles.input, { backgroundColor: '#F8FAFC', color: '#0F172A', borderColor: '#CBD5E1', marginBottom: 16 }]}
              value={newMedFreq}
              onChangeText={setNewMedFreq}
              placeholder="e.g. Twice daily with meals"
              placeholderTextColor="#94A3B8"
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
              <TouchableOpacity onPress={() => setShowMedModal(false)} style={styles.cancelBtn}>
                <Text style={{ color: '#0F172A', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAddMed} style={styles.saveBtn}>
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Save</Text>
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
            <Text style={styles.inputLabel}>Condition / Diagnosis</Text>
            <TextInput
              style={[styles.input, { backgroundColor: '#F8FAFC', color: '#0F172A', borderColor: '#CBD5E1', marginBottom: 16 }]}
              value={newCondName}
              onChangeText={setNewCondName}
              placeholder="e.g. Type 2 Diabetes, Hypertension, Asthma"
              placeholderTextColor="#94A3B8"
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
              <TouchableOpacity onPress={() => setShowCondModal(false)} style={styles.cancelBtn}>
                <Text style={{ color: '#0F172A', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAddCondition} style={styles.saveBtn}>
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 5: Add Emergency Contact */}
      <Modal visible={showContactModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Emergency Contact</Text>
            <Text style={styles.inputLabel}>Contact Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: '#F8FAFC', color: '#0F172A', borderColor: '#CBD5E1', marginBottom: 10 }]}
              value={newContactName}
              onChangeText={setNewContactName}
              placeholder="e.g. Priya Sharma"
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
                    paddingVertical: 5,
                    borderRadius: 6,
                    backgroundColor: newContactRel === rel ? '#F0FDFA' : '#F1F5F9',
                    borderWidth: 1,
                    borderColor: newContactRel === rel ? '#0D9488' : '#E2E8F0'
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: newContactRel === rel ? '#0D9488' : '#0F172A' }}>{rel}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.inputLabel}>Phone Number (with country code)</Text>
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

      {/* MODAL 6: Add Dependent (with Dedicated QR Code) */}
      <Modal visible={showDependentModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Family Dependent</Text>
            <Text style={{ color: '#64748B', fontSize: 12, marginBottom: 12 }}>
              Creates an independent medical profile and dedicated QR badge managed under your account:
            </Text>
            <Text style={styles.inputLabel}>Full Name *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: '#F8FAFC', color: '#0F172A', borderColor: '#CBD5E1', marginBottom: 10 }]}
              value={depName}
              onChangeText={setDepName}
              placeholder="e.g. Aarav Sharma"
              placeholderTextColor="#94A3B8"
            />
            <Text style={styles.inputLabel}>Relationship</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {['Child', 'Elderly Parent', 'Spouse', 'Other'].map(r => (
                <TouchableOpacity
                  key={r}
                  onPress={() => setDepRel(r)}
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 5,
                    borderRadius: 6,
                    backgroundColor: depRel === r ? '#F0FDFA' : '#F1F5F9',
                    borderWidth: 1,
                    borderColor: depRel === r ? '#0D9488' : '#E2E8F0'
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: depRel === r ? '#0D9488' : '#0F172A' }}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Blood Group</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {BLOOD_GROUPS.map(bg => (
                <TouchableOpacity
                  key={bg}
                  onPress={() => setDepBlood(bg)}
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 6,
                    backgroundColor: depBlood === bg ? '#FEF2F2' : '#F1F5F9',
                    borderWidth: 1,
                    borderColor: depBlood === bg ? '#DC2626' : '#E2E8F0'
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: depBlood === bg ? '#DC2626' : '#0F172A' }}>{bg}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Emergency Notes (Optional)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: '#F8FAFC', color: '#0F172A', borderColor: '#CBD5E1', marginBottom: 16 }]}
              value={depNotes}
              onChangeText={setDepNotes}
              placeholder="e.g. Asthma, peanut allergy"
              placeholderTextColor="#94A3B8"
            />

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
              <TouchableOpacity onPress={() => setShowDependentModal(false)} style={styles.cancelBtn}>
                <Text style={{ color: '#0F172A', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCreateDependent} style={styles.saveBtn}>
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Enroll & Mint QR</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 7: Link Existing User Account */}
      <Modal visible={showLinkModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Link Existing Account</Text>
            <Text style={{ color: '#64748B', fontSize: 12, marginBottom: 12 }}>
              Link another user who already has an EMP account so you receive each other's emergency alerts:
            </Text>
            <Text style={styles.inputLabel}>Their Registered Email *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: '#F8FAFC', color: '#0F172A', borderColor: '#CBD5E1', marginBottom: 10 }]}
              value={linkEmail}
              onChangeText={setLinkEmail}
              placeholder="e.g. spouse@example.com"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Text style={styles.inputLabel}>Relationship</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
              {RELATIONSHIP_OPTIONS.map(rel => (
                <TouchableOpacity
                  key={rel}
                  onPress={() => setLinkRel(rel)}
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 5,
                    borderRadius: 6,
                    backgroundColor: linkRel === rel ? '#F0FDFA' : '#F1F5F9',
                    borderWidth: 1,
                    borderColor: linkRel === rel ? '#0D9488' : '#E2E8F0'
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: linkRel === rel ? '#0D9488' : '#0F172A' }}>{rel}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
              <TouchableOpacity onPress={() => setShowLinkModal(false)} style={styles.cancelBtn}>
                <Text style={{ color: '#0F172A', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleLinkExisting} style={styles.saveBtn}>
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Send Link Request</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 8: Invite Adult Family Member */}
      <Modal visible={showInviteModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Invite Adult Family Member</Text>
            <Text style={{ color: '#64748B', fontSize: 12, marginBottom: 12 }}>
              Invite an adult family member who does not yet have an account:
            </Text>
            <Text style={styles.inputLabel}>Full Name *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: '#F8FAFC', color: '#0F172A', borderColor: '#CBD5E1', marginBottom: 10 }]}
              value={invName}
              onChangeText={setInvName}
              placeholder="e.g. Anjali Sharma"
              placeholderTextColor="#94A3B8"
            />
            <Text style={styles.inputLabel}>Relationship</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {RELATIONSHIP_OPTIONS.map(rel => (
                <TouchableOpacity
                  key={rel}
                  onPress={() => setInvRel(rel)}
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 5,
                    borderRadius: 6,
                    backgroundColor: invRel === rel ? '#F0FDFA' : '#F1F5F9',
                    borderWidth: 1,
                    borderColor: invRel === rel ? '#0D9488' : '#E2E8F0'
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: invRel === rel ? '#0D9488' : '#0F172A' }}>{rel}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.inputLabel}>Email Address</Text>
            <TextInput
              style={[styles.input, { backgroundColor: '#F8FAFC', color: '#0F172A', borderColor: '#CBD5E1', marginBottom: 10 }]}
              value={invEmail}
              onChangeText={setInvEmail}
              placeholder="e.g. anjali@example.com"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Text style={styles.inputLabel}>Mobile Phone</Text>
            <TextInput
              style={[styles.input, { backgroundColor: '#F8FAFC', color: '#0F172A', borderColor: '#CBD5E1', marginBottom: 16 }]}
              value={invPhone}
              onChangeText={setInvPhone}
              placeholder="+91 98765 43210"
              placeholderTextColor="#94A3B8"
              keyboardType="phone-pad"
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
              <TouchableOpacity onPress={() => setShowInviteModal(false)} style={styles.cancelBtn}>
                <Text style={{ color: '#0F172A', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSendInvite} style={styles.saveBtn}>
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Dispatch Invite</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 9: Manage Permissions for Family Member */}
      <Modal visible={!!showPermissionsModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Manage Emergency Permissions</Text>
            <Text style={{ color: '#64748B', fontSize: 12, marginBottom: 12 }}>
              Configure permissions for {showPermissionsModal?.full_name || 'family member'}:
            </Text>

            <View style={styles.switchRow}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={{ fontWeight: '700', fontSize: 13, color: '#0F172A' }}>Receive Emergency Alerts</Text>
                <Text style={{ color: '#64748B', fontSize: 11 }}>Notified immediately if my QR is scanned</Text>
              </View>
              <Switch
                value={permAlerts}
                onValueChange={setPermAlerts}
                trackColor={{ false: '#CBD5E1', true: '#2DD4BF' }}
                thumbColor={permAlerts ? '#0D9488' : '#F1F5F9'}
              />
            </View>

            <View style={styles.switchRow}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={{ fontWeight: '700', fontSize: 13, color: '#0F172A' }}>Can View Medical Records</Text>
                <Text style={{ color: '#64748B', fontSize: 11 }}>Access clinical conditions and medications</Text>
              </View>
              <Switch
                value={permMedical}
                onValueChange={setPermMedical}
                trackColor={{ false: '#CBD5E1', true: '#2DD4BF' }}
                thumbColor={permMedical ? '#0D9488' : '#F1F5F9'}
              />
            </View>

            <View style={[styles.switchRow, { marginBottom: 16 }]}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={{ fontWeight: '700', fontSize: 13, color: '#0F172A' }}>Can Manage QR Badge</Text>
                <Text style={{ color: '#64748B', fontSize: 11 }}>Permission to suspend or regenerate QR</Text>
              </View>
              <Switch
                value={permManageQR}
                onValueChange={setPermManageQR}
                trackColor={{ false: '#CBD5E1', true: '#2DD4BF' }}
                thumbColor={permManageQR ? '#0D9488' : '#F1F5F9'}
              />
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
              <TouchableOpacity onPress={() => setShowPermissionsModal(null)} style={styles.cancelBtn}>
                <Text style={{ color: '#0F172A', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSavePermissions} style={styles.saveBtn}>
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Save Permissions</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 10: Join Organization Modal */}
      <Modal visible={showJoinOrgModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Join Organization Network</Text>
            <Text style={{ color: '#64748B', fontSize: 12, marginBottom: 12 }}>
              Enter your employer's company code to link with their duty-of-care medical desk:
            </Text>

            <Text style={styles.inputLabel}>Company Code *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: '#F8FAFC', color: '#0F172A', borderColor: '#CBD5E1', marginBottom: 10 }]}
              value={joinCompanyCode}
              onChangeText={setJoinCompanyCode}
              placeholder="e.g. apex"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>Employee ID (Optional)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: '#F8FAFC', color: '#0F172A', borderColor: '#CBD5E1', marginBottom: 10 }]}
              value={joinEmployeeId}
              onChangeText={setJoinEmployeeId}
              placeholder="e.g. APEX-1049"
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.inputLabel}>Department (Optional)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: '#F8FAFC', color: '#0F172A', borderColor: '#CBD5E1', marginBottom: 16 }]}
              value={joinDepartment}
              onChangeText={setJoinDepartment}
              placeholder="e.g. Operations, IT"
              placeholderTextColor="#94A3B8"
            />

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
              <TouchableOpacity onPress={() => setShowJoinOrgModal(false)} style={styles.cancelBtn}>
                <Text style={{ color: '#0F172A', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleJoinOrganization} style={styles.saveBtn} disabled={orgLoading}>
                {orgLoading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Join Network</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 11: Add Surgery */}
      <Modal visible={showSurgeryModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Surgery / Procedure</Text>
            <Text style={styles.inputLabel}>Procedure Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: '#F8FAFC', color: '#0F172A', borderColor: '#CBD5E1', marginBottom: 10 }]}
              value={newSurgeryProcedure}
              onChangeText={setNewSurgeryProcedure}
              placeholder="e.g. Appendectomy, Knee Arthroscopy"
              placeholderTextColor="#94A3B8"
            />
            <Text style={styles.inputLabel}>Year Performed</Text>
            <TextInput
              style={[styles.input, { backgroundColor: '#F8FAFC', color: '#0F172A', borderColor: '#CBD5E1', marginBottom: 16 }]}
              value={newSurgeryYear}
              onChangeText={setNewSurgeryYear}
              placeholder="e.g. 2018"
              placeholderTextColor="#94A3B8"
              keyboardType="number-pad"
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
              <TouchableOpacity onPress={() => setShowSurgeryModal(false)} style={styles.cancelBtn}>
                <Text style={{ color: '#0F172A', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAddSurgery} style={styles.saveBtn}>
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 12: Add Medical Device / Implant */}
      <Modal visible={showDeviceModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Implant or Device</Text>
            <Text style={styles.inputLabel}>Device Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: '#F8FAFC', color: '#0F172A', borderColor: '#CBD5E1', marginBottom: 10 }]}
              value={newDeviceName}
              onChangeText={setNewDeviceName}
              placeholder="e.g. Cardiac Stent, Pacemaker, Insulin Pump"
              placeholderTextColor="#94A3B8"
            />
            <Text style={styles.inputLabel}>Clinical Details / Model</Text>
            <TextInput
              style={[styles.input, { backgroundColor: '#F8FAFC', color: '#0F172A', borderColor: '#CBD5E1', marginBottom: 16 }]}
              value={newDeviceDetails}
              onChangeText={setNewDeviceDetails}
              placeholder="e.g. Placed in LAD artery in 2022"
              placeholderTextColor="#94A3B8"
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
              <TouchableOpacity onPress={() => setShowDeviceModal(false)} style={styles.cancelBtn}>
                <Text style={{ color: '#0F172A', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAddDevice} style={styles.saveBtn}>
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
    paddingTop: 12,
    paddingBottom: 12,
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
  authModeSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  authModeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  authModeBtnActive: {
    backgroundColor: '#0D9488',
  },
  authModeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
  },
  authModeTextActive: {
    color: '#FFFFFF',
  },
  registerInfoBanner: {
    backgroundColor: '#134E4A',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#0D9488',
  },
  roleChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  roleChipActive: {
    backgroundColor: '#0D9488',
    borderColor: '#2DD4BF',
  },
  roleChipText: {
    color: '#94A3B8',
    fontSize: 11.5,
    fontWeight: '700',
  },
  roleChipTextActive: {
    color: '#FFFFFF',
  },
  demoBox: {
    backgroundColor: '#1E293B',
    padding: 10,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  demoTitle: {
    color: '#94A3B8',
    fontSize: 10.5,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  demoBtn: {
    flex: 1,
    backgroundColor: '#334155',
    paddingVertical: 7,
    borderRadius: 6,
    alignItems: 'center',
  },
  demoBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 11,
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
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  loginBtn: {
    backgroundColor: '#DC2626',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  logoutBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
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
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 15,
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
  badgeRevoked: {
    backgroundColor: '#FEE2E2',
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
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 11.5,
  },
  callIconBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
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
    paddingTop: 6,
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
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  navIcon: {
    fontSize: 19,
    marginBottom: 2,
  },
  navLabel: {
    fontSize: 10,
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
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    width: '100%',
    maxWidth: 380,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
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
