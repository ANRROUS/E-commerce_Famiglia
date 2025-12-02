import React from 'react';
import { TextField, InputAdornment, IconButton } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';

const BuscadorProductos = ({ value, onChange, placeholder = 'Buscar productos...' }) => {
  return (
    <TextField
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      variant="outlined"
      size="small"
      fullWidth
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon sx={{ color: '#8b3e3e' }} />
          </InputAdornment>
        ),
        endAdornment: value ? (
          <InputAdornment position="end">
            <IconButton size="small" onClick={() => onChange('')}>
              <CloseIcon sx={{ color: '#8b3e3e' }} />
            </IconButton>
          </InputAdornment>
        ) : null,
      }}
      sx={{
        '& .MuiOutlinedInput-root': {
          borderRadius: '999px',
          backgroundColor: '#fff',
          transition: 'all 0.3s ease',
          '&:hover fieldset': {
            borderColor: '#8b3e3e',
          },
          '&.Mui-focused fieldset': {
            borderColor: '#8b3e3e',
            borderWidth: '2px',
          },
        },
      }}
    />
  );
};

export default BuscadorProductos;
