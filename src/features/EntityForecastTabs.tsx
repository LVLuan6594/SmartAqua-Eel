import React from 'react';
import {useSearchParams} from 'react-router-dom';

export default function EntityForecastTabs({overviewLabel}:{overviewLabel:string}){
 const [params,setParams]=useSearchParams();
 const forecast=params.get('tab')==='forecast';
 const choose=(prediction:boolean)=>{const next=new URLSearchParams(params);if(prediction)next.set('tab','forecast');else next.delete('tab');setParams(next);};
 return <div className="tabline" aria-label="Nội dung hồ sơ"><button type="button" className={!forecast?'active':''} aria-pressed={!forecast} onClick={()=>choose(false)}>{overviewLabel}</button><button type="button" className={forecast?'active':''} aria-pressed={forecast} onClick={()=>choose(true)}>Dự báo sản lượng</button></div>;
}
