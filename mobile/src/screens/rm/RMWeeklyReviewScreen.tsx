import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '@/auth/AuthContext';
import { useApi } from '@/api/useApi';
import { api } from '@/api/client';
import { Screen, Row, Label, Chip, TextArea, Button, Card, Text, Loading, ErrorNote } from '@/components/ui';
import { BoardHeader } from '@/components/board';

const friday = () => { const d=new Date(); d.setDate(d.getDate()+((5-d.getDay()+7)%7)); return d.toISOString().slice(0,10); };
const arr=(v:any):any[]=>Array.isArray(v)?v:v?.data||v?.houses||[];
export function RMWeeklyReviewScreen(){
 const {user}=useAuth(); const uid=user?.id||user?.user_id; const houses=useApi<any>(uid?`/users/${uid}/houses`:null);
 const [houseId,setHouseId]=useState(''); const [week,setWeek]=useState(friday());
 const hid=houseId||arr(houses.data)[0]?.id||'';
 const preview=useApi<any>(hid?`/weekly-reviews/preview?house_id=${hid}&week_ending=${week}`:null,[hid,week]);
 const [interpretation,setInterpretation]=useState(''); const [position,setPosition]=useState('Stable'); const [narrative,setNarrative]=useState(''); const [lessons,setLessons]=useState(''); const [ahead,setAhead]=useState(''); const [busy,setBusy]=useState(false);
 const finalise=async()=>{ if(interpretation.trim().length<20||narrative.trim().length<40||lessons.trim().length<20||ahead.trim().length<10){Alert.alert('Complete the review','Interpretation and lessons need 20 characters, narrative 40, and week-ahead note 10.');return;} setBusy(true); try { const base=preview.data?.content||preview.data?.data?.content||preview.data?.data||preview.data||{}; const saved:any=await api.post('/weekly-reviews',{house_id:hid,week_ending:week,step_reached:15,status:'draft',content:{...base,step8_interpretation:interpretation.trim(),step14_overall_position:position,step15_narrative:narrative.trim(),lessons_learnt:lessons.trim(),anticipated_risks:{...(base.anticipated_risks||{}),rm_note:ahead.trim()}}}); await api.post(`/weekly-reviews/${saved.id}/finalise`,{}); Alert.alert('Weekly review finalised','It is locked for RM editing and awaiting independent validation.'); } catch(e:any){Alert.alert("Couldn't finalise",e?.message||'Try again.');} finally{setBusy(false);} };
 if(houses.loading&&!houses.data)return <Screen><Loading/></Screen>;
 return <Screen refreshing={preview.loading} onRefresh={preview.refetch}><BoardHeader title="Weekly Governance Review" subtitle="Registered Manager reflection and finalisation"/>
  <Label>Service</Label><Row gap={6} style={{flexWrap:'wrap'}}>{arr(houses.data).map(h=><Chip key={h.id} label={h.name} active={hid===h.id} onPress={()=>setHouseId(h.id)}/>)}</Row>
  <Label>Week ending</Label><TextArea value={week} onChangeText={setWeek} placeholder="YYYY-MM-DD" minHeight={44}/>
  {preview.error?<ErrorNote message={preview.error} onRetry={preview.refetch}/>:<Card><Text size={12} muted>Evidence is populated by the same weekly review service used by the web application. Your interpretation below remains your own signed account.</Text></Card>}
  <Label>What we knew and what it means</Label><TextArea value={interpretation} onChangeText={setInterpretation} placeholder="Leadership interpretation…" minHeight={80} required/>
  <Label>Overall position</Label><Row gap={6}>{['Stable','Watch','Concern'].map(v=><Chip key={v} label={v} active={position===v} onPress={()=>setPosition(v)}/>)}</Row>
  <Label>Governance narrative</Label><TextArea value={narrative} onChangeText={setNarrative} placeholder="What we knew, what we did and the current position…" minHeight={110} required/>
  <Label>Lessons learnt</Label><TextArea value={lessons} onChangeText={setLessons} placeholder="What was learnt this week…" minHeight={75} required/>
  <Label>Week ahead</Label><TextArea value={ahead} onChangeText={setAhead} placeholder="Anticipated risks, or why none are anticipated…" minHeight={75} required/>
  <Button title="Finalise for validation" onPress={finalise} loading={busy} disabled={!hid}/>
 </Screen>;
}
