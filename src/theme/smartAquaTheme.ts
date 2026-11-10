import {createTheme, alpha} from '@mui/material/styles';

/** SmartAqua Eel — CTU-inspired palette, an independent product identity. */
export const colors = {
  primary:'#1F5CA9', cyan:'#00AFEF', sidebar:'#113961', sidebarDeep:'#0A2849',
  ink:'#163250', muted:'#53677D', background:'#F4F7FC', border:'#E4EAF3',
  success:'#159B7A', warning:'#F1A349', soft:'#E9F2FD', white:'#FFFFFF'
};
export const smartAquaTheme = createTheme({
  palette:{mode:'light',primary:{main:colors.primary,dark:'#174782',light:'#5E98DB'},secondary:{main:colors.cyan},
   background:{default:colors.background,paper:'#FFFFFF'},text:{primary:colors.ink,secondary:colors.muted},
   divider:colors.border,success:{main:colors.success},warning:{main:colors.warning}},
  shape:{borderRadius:14},
  // Readability-first typography: Vietnamese language, mobile-first and accessible scale.
  typography:{
   fontFamily:'"Be Vietnam Pro", "Segoe UI", Arial, sans-serif',fontSize:16,htmlFontSize:16,
   fontWeightRegular:400,fontWeightMedium:500,fontWeightBold:700,
   h3:{fontSize:'clamp(1.75rem, 3vw, 2.25rem)',fontWeight:700,lineHeight:1.35,letterSpacing:'-.35px'},
   h4:{fontSize:'clamp(1.65rem, 2.5vw, 2rem)',fontWeight:700,lineHeight:1.35,letterSpacing:'-.3px'},
   h5:{fontSize:'clamp(1.35rem, 2vw, 1.55rem)',fontWeight:700,lineHeight:1.4},
   h6:{fontSize:'1.18rem',fontWeight:650,lineHeight:1.45},
   subtitle1:{fontSize:'1rem',fontWeight:650,lineHeight:1.55},
   subtitle2:{fontSize:'.94rem',fontWeight:600,lineHeight:1.5},
   body1:{fontSize:'1rem',lineHeight:1.7},
   body2:{fontSize:'.9375rem',lineHeight:1.65},
   caption:{fontSize:'.875rem',lineHeight:1.5},
   overline:{fontSize:'.8125rem',fontWeight:650,lineHeight:1.5,letterSpacing:'.4px'},
   button:{fontSize:'.9375rem',lineHeight:1.5,textTransform:'none',fontWeight:600,letterSpacing:0}
  },
  components:{
   MuiCssBaseline:{styleOverrides:{'body':{backgroundColor:colors.background,fontFamily:'"Be Vietnam Pro", "Segoe UI", Arial, sans-serif'},
    '::-webkit-scrollbar':{width:8,height:8},'::-webkit-scrollbar-thumb':{background:'#CAD5E4',borderRadius:8}}},
   MuiButton:{defaultProps:{disableElevation:true},styleOverrides:{root:{borderRadius:11,minHeight:46,paddingInline:18},containedPrimary:{background:'linear-gradient(112deg,#1F5CA9 0%,#2476C4 100%)',':hover':{background:'linear-gradient(112deg,#164984 0%,#195B9E 100%)'}}}},
   MuiCard:{styleOverrides:{root:{border:'1px solid '+colors.border,borderRadius:17,boxShadow:'0 5px 21px rgba(22,55,91,.035)'}}},
   MuiPaper:{styleOverrides:{root:{backgroundImage:'none'}}},
   MuiOutlinedInput:{styleOverrides:{root:{borderRadius:11,background:'#FFFFFF',':hover .MuiOutlinedInput-notchedOutline':{borderColor:colors.primary}}}},
   MuiChip:{styleOverrides:{root:{fontWeight:650,borderRadius:9,fontSize:13}}},
   MuiTooltip:{styleOverrides:{tooltip:{fontSize:13,borderRadius:8}}},
   MuiIconButton:{styleOverrides:{root:{minWidth:44,minHeight:44,color:colors.primary,':hover':{backgroundColor:alpha(colors.primary,.07)}}}},
   MuiMenuItem:{styleOverrides:{root:{minHeight:46,fontSize:15}}},
   MuiInputBase:{styleOverrides:{input:{fontSize:16}}},
   MuiFormLabel:{styleOverrides:{root:{fontSize:15}}}
  }
});
