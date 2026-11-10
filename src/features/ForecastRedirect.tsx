import React from 'react';
import {Navigate,useSearchParams} from 'react-router-dom';
import {useDemo} from '../store/demoStore';
import {forecastScopeContext} from '../ai/scopedForecast';
import type {ForecastScope} from '../types/models';

/** Keep old bookmarks useful while forecasts live only inside entity profiles. */
export default function ForecastRedirect(){
 const {db,role}=useDemo(),[params]=useSearchParams();
 const candidates:ForecastScope[]=[{kind:'pond',id:params.get('pond')||''},{kind:'farmer',id:params.get('farmer')||''},{kind:'area',id:params.get('area')||''}];
 for(const scope of candidates){
  const context=scope.id?forecastScopeContext(db,role,scope):null;
  if(!context)continue;
  const to=scope.kind==='pond'?`/ponds/${encodeURIComponent(scope.id)}`:scope.kind==='area'?`/areas/${encodeURIComponent(scope.id)}`:`/areas/${encodeURIComponent(context.entity.areaId)}/farms/${encodeURIComponent(scope.id)}`;
  return <Navigate replace to={`${to}?tab=forecast`}/>;
 }
 return <Navigate replace to="/areas"/>;
}
