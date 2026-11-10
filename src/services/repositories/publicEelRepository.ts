import {useEffect,useState} from 'react';
import json from '../../data/eel-public-data.json';
import {apiBase,dataMode} from '../datasetGateway';
export type PublicEelDataset=typeof json;
export const coverageLabels:Record<string,string>={reported_current:'Có nguồn nêu địa bàn hiện tại',historical_mapped:'Có nguồn lịch sử đã đối chiếu',mapping_needs_review:'Cần rà soát ánh xạ',not_found_in_collected_sources:'Chưa thấy trong tập nguồn'};
export const publicEelRepository={
 async getAll():Promise<PublicEelDataset>{
  if(dataMode==='mock')return json;
  const response=await fetch(apiBase+'/eel-public-data',{credentials:'include'});
  if(!response.ok)throw new Error('Không tải được dữ liệu công khai.');
  const result=await response.json();
  if(!Array.isArray(result.coverage)||!Array.isArray(result.sources)||!Array.isArray(result.observations))throw new Error('Dữ liệu công khai chưa đúng hợp đồng.');
  return result;
 }
};
export function usePublicEelData(){
 const [data,setData]=useState<PublicEelDataset|null>(null),[error,setError]=useState('');
 useEffect(()=>{let active=true;publicEelRepository.getAll().then(value=>{if(active)setData(value);}).catch(issue=>{if(active)setError(issue.message);});return()=>{active=false;};},[]);
 return {data,error};
}
export const metricLabels:Record<string,string>={households:'Hộ nuôi',farmingArea:'Diện tích nuôi',unsoldHouseholds:'Hộ chưa tiêu thụ',unsoldBiomass:'Lượng đến kỳ chưa tiêu thụ',reportedProduction:'Sản lượng theo bài báo',members:'Thành viên tổ hợp tác',stockingPopulation:'Quy mô đàn',harvestQuantity:'Thu hoạch của trường hợp mẫu',cycleDuration:'Thời gian vụ',tanks:'Số bể',tankArea:'Diện tích mỗi bể',sampleHouseholds:'Hộ trong mẫu nghiên cứu',yield:'Năng suất mẫu',survivalRate:'Tỷ lệ sống mẫu'};
export const qualifierLabels:Record<string,string>={nearly:'Gần ',greater_than:'Trên ',approximately:'Khoảng ',estimated:'Ước tính ',reported:''};
