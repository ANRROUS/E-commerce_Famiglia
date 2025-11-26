import { useState, useEffect } from 'react';
import { useVoice } from '../../context/VoiceContext';
import { useTextToSpeech } from '../../hooks/useTextToSpeech';
import Modal from './Modal';
import { Box, Typography, Button, List, ListItem, ListItemText, ListItemButton, Divider } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';

export default function VoiceSettingsModal({ isOpen, onClose }) {
    const { selectedVoice, setSelectedVoice, speak } = useVoice();
    const { getVoicesByLanguage } = useTextToSpeech();
    const [voices, setVoices] = useState([]);

    useEffect(() => {
        if (isOpen) {
            // Filtrar voces en español
            const spanishVoices = getVoicesByLanguage('es');
            setVoices(spanishVoices);
        }
    }, [isOpen, getVoicesByLanguage]);

    const handleSelectVoice = (voice) => {
        setSelectedVoice(voice);
        // Prueba de voz inmediata
        speak('Hola, soy tu nuevo asistente de voz en Famiglia.', { voiceName: voice.name });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Configuración de Voz">
            <Box sx={{ p: 2, minWidth: { xs: '300px', sm: '400px' } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <RecordVoiceOverIcon sx={{ fontSize: 40, color: '#8b3e3e' }} />
                    <Typography variant="body1" sx={{ color: '#555' }}>
                        Selecciona la voz que prefieras para tu asistente.
                    </Typography>
                </Box>

                <Typography variant="h6" sx={{ color: '#8b3e3e', mb: 2, fontWeight: 700 }}>
                    Voces Disponibles (Español)
                </Typography>

                {voices.length === 0 ? (
                    <Typography sx={{ color: '#999', fontStyle: 'italic' }}>
                        Cargando voces o no se encontraron voces en español...
                    </Typography>
                ) : (
                    <List sx={{ maxHeight: '300px', overflow: 'auto', bgcolor: '#f9f9f9', borderRadius: 2 }}>
                        {voices.map((voice, index) => (
                            <div key={voice.name}>
                                <ListItem disablePadding>
                                    <ListItemButton
                                        onClick={() => handleSelectVoice(voice)}
                                        selected={selectedVoice?.name === voice.name}
                                        sx={{
                                            '&.Mui-selected': {
                                                bgcolor: '#ffe3d9',
                                                '&:hover': { bgcolor: '#ffd0c0' },
                                            },
                                        }}
                                    >
                                        <ListItemText
                                            primary={voice.name}
                                            secondary={voice.lang}
                                            primaryTypographyProps={{ fontWeight: selectedVoice?.name === voice.name ? 700 : 400 }}
                                        />
                                        {selectedVoice?.name === voice.name && (
                                            <CheckIcon sx={{ color: '#8b3e3e' }} />
                                        )}
                                    </ListItemButton>
                                </ListItem>
                                {index < voices.length - 1 && <Divider />}
                            </div>
                        ))}
                    </List>
                )}

                <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                        variant="contained"
                        onClick={onClose}
                        sx={{
                            bgcolor: '#8b3e3e',
                            '&:hover': { bgcolor: '#a05050' },
                            textTransform: 'none',
                            fontWeight: 600,
                        }}
                    >
                        Listo
                    </Button>
                </Box>
            </Box>
        </Modal>
    );
}
