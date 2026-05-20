import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import client from '@/src/api/client';
import { Check, ChevronRight, ChevronLeft, Info } from 'lucide-react-native';

const STEPS = [
  'House & Domain',
  'Signal Details',
  'Risk Analysis',
  'Review & Submit'
];

export default function CaptureScreen() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [houses, setHouses] = useState([]);
  const [domains, setDomains] = useState([]);
  
  const [formData, setFormData] = useState({
    house_id: '',
    risk_domain: [],
    signal_description: '',
    severity: 'Medium',
    immediate_action: '',
    is_confidential: false,
  });

  useEffect(() => {
    fetchMetadata();
  }, []);

  const fetchMetadata = async () => {
    try {
      const [housesRes, domainsRes] = await Promise.all([
        client.get('/houses'),
        client.get('/pulse/categories')
      ]);
      setHouses(housesRes.data);
      setDomains(domainsRes.data);
    } catch (error) {
      console.error('Failed to fetch metadata', error);
    }
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await client.post('/governance/pulse', formData);
      Alert.alert('Success', 'Signal captured successfully!', [
        { text: 'OK', onPress: () => {
          setStep(0);
          setFormData({
            house_id: '',
            risk_domain: [],
            signal_description: '',
            severity: 'Medium',
            immediate_action: '',
            is_confidential: false,
          });
        }}
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to submit signal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
      <View className="px-6 py-4 border-b border-gray-100 bg-white">
        <View className="flex-row justify-between items-center mb-4">
          {STEPS.map((_, i) => (
            <View 
              key={i} 
              className={`h-1.5 flex-1 mx-0.5 rounded-full ${i <= step ? 'bg-secondary' : 'bg-gray-200'}`} 
            />
          ))}
        </View>
        <Text className="text-xl font-bold text-primary">{STEPS[step]}</Text>
      </View>

      <ScrollView className="flex-1 px-6 pt-6">
        {step === 0 && (
          <View className="space-y-6">
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-2">Select House</Text>
              <View className="space-y-2">
                {houses.map((house: any) => (
                  <TouchableOpacity 
                    key={house.id}
                    onPress={() => setFormData({...formData, house_id: house.id})}
                    className={`p-4 rounded-xl border ${formData.house_id === house.id ? 'border-secondary bg-blue-50' : 'border-gray-200 bg-white'}`}
                  >
                    <Text className={`font-medium ${formData.house_id === house.id ? 'text-secondary' : 'text-primary'}`}>
                      {house.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}

        {step === 1 && (
          <View className="space-y-6">
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-2">Signal Description</Text>
              <TextInput
                className="bg-white border border-gray-200 rounded-xl p-4 min-h-[150] text-base"
                placeholder="Describe the observation in detail..."
                multiline
                textAlignVertical="top"
                value={formData.signal_description}
                onChangeText={(text) => setFormData({...formData, signal_description: text})}
              />
            </View>
          </View>
        )}

        {/* ... Other steps logic ... */}
        
        {step === 3 && (
          <View className="space-y-6">
            <View className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
              <View className="flex-row items-center mb-4">
                <Info size={20} color="#10b981" />
                <Text className="ml-2 font-bold text-emerald-800">Final Review</Text>
              </View>
              <Text className="text-emerald-700 mb-2">You are about to submit a governance signal for review.</Text>
              <View className="mt-4 space-y-2">
                <Text className="text-xs text-emerald-600">House: {houses.find(h => h.id === formData.house_id)?.name || 'Not selected'}</Text>
                <Text className="text-xs text-emerald-600">Severity: {formData.severity}</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      <View className="p-6 border-t border-gray-100 bg-white flex-row space-x-4">
        {step > 0 && (
          <TouchableOpacity 
            onPress={handleBack}
            className="flex-1 bg-gray-100 py-4 rounded-xl items-center justify-center flex-row"
          >
            <ChevronLeft size={20} color="#64748b" />
            <Text className="ml-1 font-bold text-gray-600">Back</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          onPress={step === STEPS.length - 1 ? handleSubmit : handleNext}
          className="flex-[2] bg-primary py-4 rounded-xl items-center justify-center flex-row"
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Text className="text-white font-bold mr-1">
                {step === STEPS.length - 1 ? 'Submit Signal' : 'Next'}
              </Text>
              {step < STEPS.length - 1 && <ChevronRight size={20} color="white" />}
              {step === STEPS.length - 1 && <Check size={20} color="white" />}
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
