const eelPhotos=['/images/TraiLuon01.jpg','/images/TraiLuon02.jpeg','/images/TraiLuon03.png','/images/TraiLuon04.jpg'];
const index=(id:string,length:number)=>[...id].reduce((sum,c)=>sum+c.charCodeAt(0),0)%length;
export const regionImageFor=(id:string)=>[eelPhotos[2],eelPhotos[3]][index(id,2)];
export const farmImageFor=(id:string)=>[eelPhotos[1],eelPhotos[3],eelPhotos[2]][index(id,3)];
export const pondImageFor=(id:string)=>eelPhotos[index(id,eelPhotos.length)];

