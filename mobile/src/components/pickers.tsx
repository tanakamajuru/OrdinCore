/**
 * components/pickers.tsx
 * Reanimated-free selection primitives for the signal-capture forms:
 *  - SelectModal: a tap-to-open option list (governance domain, severity, etc.)
 *  - PersonPicker: searchable service-user selector that stores the service_user
 *    identifier (person-ID doctrine), not free text — and surfaces the person's
 *    house so the signal is service-scoped.
 */
import React, { useMemo, useState } from 'react';
import { View, Modal, Pressable, ScrollView, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi } from '@/api/useApi';
import { listOf } from '@/api/mappers';
import { Text, Row } from './ui';

export type Option = { value: string; label: string; sublabel?: string };

export function SelectModal({
  placeholder,
  value,
  label,
  options,
  onSelect,
}: {
  placeholder: string;
  value?: string;
  label?: string;
  options: Option[];
  onSelect: (o: Option) => void;
}) {
  const { colors, radius, spacing } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.md,
          padding: spacing.md,
        }}
      >
        <Text muted={!selected}>{selected ? selected.label : placeholder}</Text>
        <Feather name="chevron-down" size={16} color={colors.textMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }} onPress={() => setOpen(false)}>
          <Pressable
            style={{ backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%', padding: spacing.lg }}
            onPress={(e) => e.stopPropagation()}
          >
            {label ? <Text variant="subtitle" style={{ marginBottom: spacing.md }}>{label}</Text> : null}
            <ScrollView>
              {options.length === 0 && <Text muted variant="caption">No options available.</Text>}
              {options.map((o) => (
                <Pressable
                  key={o.value}
                  onPress={() => { onSelect(o); setOpen(false); }}
                  style={{ paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }}
                >
                  <Row justify="space-between">
                    <View style={{ flex: 1 }}>
                      <Text weight={o.value === value ? '700' : '500'}>{o.label}</Text>
                      {o.sublabel ? <Text muted variant="caption">{o.sublabel}</Text> : null}
                    </View>
                    {o.value === value ? <Feather name="check" size={16} color={colors.accent} /> : null}
                  </Row>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

export type PersonSelection = { service_user_id: string; related_person: string; house_id?: string; house_name?: string };

export function PersonPicker({
  value,
  onSelect,
}: {
  value?: PersonSelection | null;
  onSelect: (p: PersonSelection) => void;
}) {
  const { colors, radius, spacing } = useTheme();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const { data } = useApi<any>('/service-users');

  const people = useMemo(() => listOf(data).map((su: any) => ({
    service_user_id: String(su.id),
    related_person: su.display_name || [su.first_name, su.last_name].filter(Boolean).join(' '),
    house_id: su.house_id,
    house_name: su.house_name,
  })), [data]);

  const filtered = q.trim()
    ? people.filter((p) => p.related_person.toLowerCase().includes(q.toLowerCase()) || String(p.house_name || '').toLowerCase().includes(q.toLowerCase()))
    : people;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md }}
      >
        <Text muted={!value}>{value ? value.related_person : 'Search and select a person'}</Text>
        <Feather name="chevron-right" size={16} color={colors.textMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }} onPress={() => setOpen(false)}>
          <Pressable
            style={{ backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%', padding: spacing.lg }}
            onPress={(e) => e.stopPropagation()}
          >
            <Text variant="subtitle" style={{ marginBottom: spacing.md }}>Select person</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, marginBottom: spacing.md }}>
              <Feather name="search" size={16} color={colors.textMuted} />
              <TextInput
                value={q}
                onChangeText={setQ}
                placeholder="Search by name or house"
                placeholderTextColor={colors.textMuted}
                style={{ flex: 1, paddingVertical: spacing.sm, color: colors.text }}
              />
            </View>
            <ScrollView>
              {filtered.length === 0 && <Text muted variant="caption">No people found.</Text>}
              {filtered.map((p) => (
                <Pressable
                  key={p.service_user_id}
                  onPress={() => { onSelect(p); setOpen(false); }}
                  style={{ paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }}
                >
                  <Text weight={p.service_user_id === value?.service_user_id ? '700' : '500'}>{p.related_person}</Text>
                  {p.house_name ? <Text muted variant="caption">{p.house_name}</Text> : null}
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
