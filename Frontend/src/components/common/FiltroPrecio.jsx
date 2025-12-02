import React from 'react';
import { Box, Typography, Slider } from '@mui/material';

const valorTexto = (v) => `S/${v.toFixed(2)}`;

const FiltroPrecio = ({ min = 0, max = 100, value = [0, 100], onChange }) => {
  const handleChange = (e, newValue) => {
    onChange(newValue);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Typography sx={{ color: '#6b2c2c' }}>{valorTexto(value[0])}</Typography>
        <Typography sx={{ color: '#6b2c2c' }}>{valorTexto(value[1])}</Typography>
      </Box>
      <Slider
        value={value}
        onChange={handleChange}
        valueLabelDisplay="off"
        min={min}
        max={max}
        sx={{ color: '#d32f2f' }}
      />
    </Box>
  );
};

export default FiltroPrecio;
