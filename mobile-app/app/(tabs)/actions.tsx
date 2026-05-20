import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, Modal, TextInput, ActivityIndicator, Alert } from 'react-native';
import client from '@/src/api/client';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Clock, CheckCircle2, AlertTriangle, ChevronRight, X } from 'lucide-react-native';

interface Action {
  id: string;
  title: string;
  description: string;
  status: string;
  due_date: string;
  priority: string;
}

export default function ActionsScreen() {
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);
  const [completionModal, setCompletionModal] = useState(false);
  const [outcome, setOutcome] = useState('');
  const [rationale, setRationale] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchActions = async () => {
    try {
      const response = await client.get('/api/v1/actions/my');
      setActions(response.data);
    } catch (error) {
      console.error('Failed to fetch actions', error);
      // Mock data for demonstration
      setActions([
        { id: '1', title: 'Review Staffing Levels', description: 'Address shortages in Rose House', status: 'Pending', due_date: '2026-05-20', priority: 'High' },
        { id: '2', title: 'Update Risk Assessment', description: 'Review fire safety protocols', status: 'In Progress', due_date: '2026-05-22', priority: 'Medium' },
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchActions();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchActions();
  };

  const handleComplete = async () => {
    if (!outcome || !rationale) {
      Alert.alert('Error', 'Please provide both outcome and rationale');
      return;
    }

    setSubmitting(true);
    try {
      await client.patch(`/api/v1/actions/${selectedAction?.id}/complete`, {
        outcome,
        rationale
      });
      setCompletionModal(false);
      fetchActions();
      Alert.alert('Success', 'Action marked as complete');
    } catch (error) {
      Alert.alert('Error', 'Failed to complete action');
    } finally {
      setSubmitting(false);
    }
  };

  const renderItem = ({ item }: { item: Action }) => (
    <TouchableOpacity 
      className="bg-white p-5 rounded-2xl mb-4 shadow-sm border border-gray-100"
      onPress={() => {
        setSelectedAction(item);
        setCompletionModal(true);
      }}
    >
      <View className="flex-row justify-between items-start mb-2">
        <Text className="text-lg font-bold text-primary flex-1 mr-2">{item.title}</Text>
        <View className={`px-2 py-1 rounded-md ${item.priority === 'High' ? 'bg-red-50' : 'bg-blue-50'}`}>
          <Text className={`text-xs font-bold ${item.priority === 'High' ? 'text-red-600' : 'text-blue-600'}`}>
            {item.priority}
          </Text>
        </View>
      </View>
      <Text className="text-gray-500 text-sm mb-4" numberOfLines={2}>{item.description}</Text>
      <View className="flex-row items-center">
        <Clock size={14} color="#94a3b8" />
        <Text className="text-gray-400 text-xs ml-1">Due {item.due_date}</Text>
        <View className="flex-1" />
        <ChevronRight size={18} color="#cbd5e1" />
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-background">
      <FlatList
        data={actions}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View className="items-center justify-center py-20">
            <CheckCircle2 size={64} color="#e2e8f0" />
            <Text className="text-gray-400 mt-4 text-lg">All caught up!</Text>
          </View>
        }
      />

      {/* Completion Modal */}
      <Modal visible={completionModal} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-[32] p-8 min-h-[60%]">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-bold text-primary">Complete Action</Text>
              <TouchableOpacity onPress={() => setCompletionModal(false)}>
                <X size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text className="text-gray-600 mb-6">{selectedAction?.title}</Text>

            <View className="space-y-4">
              <View>
                <Text className="text-sm font-medium text-gray-700 mb-2">Outcome</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-base"
                  placeholder="What was the result?"
                  value={outcome}
                  onChangeText={setOutcome}
                />
              </View>

              <View>
                <Text className="text-sm font-medium text-gray-700 mb-2">Rationale</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-xl p-4 min-h-[100] text-base"
                  placeholder="Explain the logic behind the completion"
                  multiline
                  textAlignVertical="top"
                  value={rationale}
                  onChangeText={setRationale}
                />
              </View>

              <TouchableOpacity
                className="bg-primary py-4 rounded-2xl items-center justify-center mt-4 shadow-lg shadow-primary/30"
                onPress={handleComplete}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-lg">Mark as Complete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
