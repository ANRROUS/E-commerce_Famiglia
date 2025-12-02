import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useVoice } from '../context/VoiceContext';
import {
  generateTest,
  getRecommendation,
  setAnswer,
  nextQuestion,
  previousQuestion,
  loadTestFromStorage,
  clearTest,
  completeTest
} from '../redux/slices/preferencesSlice';
import Button from '../components/common/Button';
import ProductCard from '../components/common/ProductCard';

const PreferencesTest = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { speak, registerCommands, unregisterCommands } = useVoice();

  const {
    questions,
    answers,
    currentQuestion,
    isLoading,
    isGeneratingTest,
    isGettingRecommendation,
    error,
    recommendation,
    testCompleted,
    hasActiveTest
  } = useSelector((state) => state.preferences);

  const [userPrompt, setUserPrompt] = useState('');

  useEffect(() => {
    // Cargar test desde localStorage si existe
    dispatch(loadTestFromStorage());
  }, [dispatch]);

  const handleStartTest = async () => {
    await dispatch(generateTest(userPrompt));
  };

  const handleAnswerSelect = (answer) => {
    dispatch(setAnswer({
      questionIndex: currentQuestion,
      answer: answer
    }));
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      dispatch(nextQuestion());
    } else {
      // Última pregunta, obtener recomendación
      dispatch(completeTest());
      dispatch(getRecommendation());
    }
  };

  const handlePrevious = () => {
    dispatch(previousQuestion());
  };

  const handleRestart = () => {
    dispatch(clearTest());
    setUserPrompt('');
  };

  const handleGoToCatalog = () => {
    dispatch(clearTest());
    navigate('/carta');
  };

  const calculateProgress = () => {
    if (questions.length === 0) return 0;
    return Math.round(((currentQuestion + 1) / questions.length) * 100);
  };

  const isAnswered = () => {
    return answers[currentQuestion] !== undefined;
  };

  // ============================================
  // COMANDOS DE VOZ ESPECÍFICOS DE PREFERENCES TEST
  // ============================================
  useEffect(() => {
    const voiceCommands = {
      'iniciar test': () => {
        if (questions.length === 0 && !isGeneratingTest) {
          handleStartTest();
          speak('Iniciando test de preferencias');
        } else {
          speak('El test ya está en curso');
        }
      },
      'responder (.+)': (opcion) => {
        if (questions.length === 0) {
          speak('Primero debes iniciar el test');
          return;
        }
        if (testCompleted) {
          speak('El test ya ha sido completado');
          return;
        }
        const currentQ = questions[currentQuestion];
        if (!currentQ || !currentQ.opciones) {
          speak('No hay opciones disponibles');
          return;
        }

        // Buscar opción por número o texto
        const opcionLower = opcion.toLowerCase();
        let selectedAnswer = null;

        if (opcionLower === 'uno' || opcionLower === '1' || opcionLower === 'primero') {
          selectedAnswer = currentQ.opciones[0];
        } else if (opcionLower === 'dos' || opcionLower === '2' || opcionLower === 'segundo') {
          selectedAnswer = currentQ.opciones[1];
        } else if (opcionLower === 'tres' || opcionLower === '3' || opcionLower === 'tercero') {
          selectedAnswer = currentQ.opciones[2];
        } else {
          // Buscar por texto
          selectedAnswer = currentQ.opciones.find(opt =>
            opt.toLowerCase().includes(opcionLower)
          );
        }

        if (selectedAnswer) {
          handleAnswerSelect(selectedAnswer);
          speak(`Opción seleccionada: ${selectedAnswer}`);
        } else {
          speak('No se encontró esa opción');
        }
      },
      'opción uno': () => {
        if (questions[currentQuestion]?.opciones?.[0]) {
          handleAnswerSelect(questions[currentQuestion].opciones[0]);
          speak(`Opción uno seleccionada`);
        }
      },
      'opción dos': () => {
        if (questions[currentQuestion]?.opciones?.[1]) {
          handleAnswerSelect(questions[currentQuestion].opciones[1]);
          speak(`Opción dos seleccionada`);
        }
      },
      'opción tres': () => {
        if (questions[currentQuestion]?.opciones?.[2]) {
          handleAnswerSelect(questions[currentQuestion].opciones[2]);
          speak(`Opción tres seleccionada`);
        }
      },
      'siguiente pregunta': () => {
        if (testCompleted) {
          speak('El test ya ha sido completado');
          return;
        }
        if (!isAnswered()) {
          speak('Primero debes responder la pregunta actual');
          return;
        }
        handleNext();
        if (currentQuestion < questions.length - 1) {
          speak('Siguiente pregunta');
        } else {
          speak('Obteniendo tu recomendación personalizada');
        }
      },
      'pregunta anterior': () => {
        if (currentQuestion > 0) {
          handlePrevious();
          speak('Pregunta anterior');
        } else {
          speak('Ya estás en la primera pregunta');
        }
      },
      'reiniciar test': () => {
        handleRestart();
        speak('Test reiniciado');
      },
      'ir al catálogo': () => {
        handleGoToCatalog();
        speak('Yendo al catálogo');
      },
      'ver recomendación': () => {
        if (testCompleted && recommendation) {
          speak('Mostrando tu recomendación personalizada');
        } else if (!testCompleted) {
          speak('Debes completar el test primero');
        } else {
          speak('Obteniendo tu recomendación');
          dispatch(getRecommendation());
        }
      },
      // NUEVOS COMANDOS DE LECTURA
      'leer pregunta': () => {
        if (questions.length === 0 || testCompleted) {
          speak('No hay preguntas disponibles');
          return;
        }
        const currentQ = questions[currentQuestion];
        speak(`Pregunta ${currentQuestion + 1} de ${questions.length}: ${currentQ?.question}`);
      },
      'leer opciones': () => {
        if (questions.length === 0 || testCompleted) {
          speak('No hay opciones disponibles');
          return;
        }
        const currentQ = questions[currentQuestion];
        if (!currentQ?.options) {
          speak('No hay opciones para esta pregunta');
          return;
        }
        const optionsText = currentQ.options.map((opt, i) =>
          `Opción ${i + 1}: ${opt.label}`
        ).join('. ');
        speak(optionsText);
      },
      'leer todo': () => {
        if (questions.length === 0 || testCompleted) {
          speak('No hay preguntas disponibles');
          return;
        }
        const currentQ = questions[currentQuestion];
        const questionText = `Pregunta ${currentQuestion + 1} de ${questions.length}: ${currentQ?.question}`;
        const optionsText = currentQ.options.map((opt, i) =>
          `Opción ${i + 1}: ${opt.label}`
        ).join('. ');
        speak(`${questionText}. ${optionsText}`);
      },
      'leer recomendación': () => {
        if (!testCompleted) {
          speak('Debes completar el test primero');
          return;
        }
        if (!recommendation || !recommendation.product) {
          speak('No hay recomendación disponible');
          return;
        }
        const productName = recommendation.product.nombre || recommendation.product.name;
        const message = recommendation.message || 'Basado en tus respuestas, te recomendamos';
        const explanation = recommendation.explanation || 'Este producto se ajusta a tus preferencias';
        speak(`${message}: ${productName}. ${explanation}`);
      },
      'qué me recomendaste': () => {
        if (!testCompleted) {
          speak('Debes completar el test primero');
          return;
        }
        if (!recommendation || !recommendation.product) {
          speak('No hay recomendación disponible');
          return;
        }
        const productName = recommendation.product.nombre || recommendation.product.name;
        speak(`Te recomendamos: ${productName}`);
      },
      'por qué esa recomendación': () => {
        if (!testCompleted) {
          speak('Debes completar el test primero');
          return;
        }
        if (!recommendation?.explanation) {
          speak('No hay explicación disponible');
          return;
        }
        speak(recommendation.explanation);
      },
    };

    registerCommands(voiceCommands);
    console.log('[PreferencesTest] ✅ Comandos de voz registrados:', Object.keys(voiceCommands).length);

    return () => {
      unregisterCommands();
      console.log('[PreferencesTest] 🗑️ Comandos de voz eliminados');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions, currentQuestion, answers, testCompleted, recommendation, isGeneratingTest]);

  if (isLoading && !questions.length) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center font-['Montserrat']">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#6b2c2c] mx-auto mb-4"></div>
          <p className="text-[#6b2c2c]">
            {isGeneratingTest ? 'Generando tu test personalizado...' : 'Cargando...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-6 sm:py-12 px-3 sm:px-6 lg:px-8 font-['Montserrat']">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#6b2c2c] mb-2">
            Test de Preferencias
          </h1>
          <p className="text-sm sm:text-base text-[#6b2c2c] opacity-80 px-2">
            Responde las siguientes preguntas para recibir una recomendación personalizada
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 sm:mb-6 bg-[#f5e6d3] border border-[#b17b6b] text-[#6b2c2c] px-3 sm:px-4 py-3 rounded text-sm sm:text-base">
            <p>{error}</p>
          </div>
        )}

        {/* Start Test Section */}
        {questions.length === 0 && !isGeneratingTest && (
          <div className="bg-white rounded-lg shadow-md border border-[#b17b6b] p-4 sm:p-6 md:p-8">
            <h2 className="text-xl sm:text-2xl font-bold text-[#6b2c2c] mb-3 sm:mb-4">
              Comenzar Test de Preferencias
            </h2>
            <div className="space-y-3 sm:space-y-4">
              <p className="text-sm sm:text-base text-[#6b2c2c] opacity-80">
                ¿Tienes alguna preferencia específica que quieras compartir?
              </p>
              <textarea
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder="Por ejemplo: Me gustan los postres con chocolate, prefiero sabores dulces..."
                className="resize-none w-full px-3 sm:px-4 py-2 border-2 border-[#b17b6b] rounded-lg focus:ring-2 focus:ring-[#6b2c2c] focus:border-[#6b2c2c] text-[#6b2c2c] text-sm sm:text-base box-border overflow-hidden"
                rows="4"
              />
              <Button
                onClick={handleStartTest}
                className="w-full text-sm sm:text-base"
              >
                Comenzar Test
              </Button>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {questions.length > 0 && !testCompleted && (
          <div className="mb-4 sm:mb-6 md:mb-8">
            <div className="flex justify-between text-xs sm:text-sm text-[#6b2c2c] mb-2">
              <span>Pregunta {currentQuestion + 1} de {questions.length}</span>
              <span>{calculateProgress()}%</span>
            </div>
            <div className="w-full bg-[#f5e6d3] rounded-full h-2">
              <div
                className="bg-[#6b2c2c] h-2 rounded-full transition-all duration-300"
                style={{ width: `${calculateProgress()}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Question and Answers */}
        {questions.length > 0 && !testCompleted && !isGettingRecommendation && (
          <div className="bg-white rounded-lg shadow-md border border-[#b17b6b] p-4 sm:p-6 md:p-8">
            <h2 className="text-lg sm:text-xl font-semibold text-[#6b2c2c] mb-4 sm:mb-6">
              {questions[currentQuestion]?.question}
            </h2>

            <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
              {questions[currentQuestion]?.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(option.value)}
                  className={`w-full text-left p-3 sm:p-4 rounded-lg border-2 transition-all ${answers[currentQuestion] === option.value
                      ? 'border-[#6b2c2c] bg-[#f5e6d3]'
                      : 'border-[#b17b6b] hover:border-[#6b2c2c] hover:bg-[#fef9f3]'
                    }`}
                >
                  <div className="font-medium text-[#6b2c2c] text-sm sm:text-base">{option.label}</div>
                  {option.description && (
                    <div className="text-xs sm:text-sm text-[#6b2c2c] opacity-70 mt-1">
                      {option.description}
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Navigation Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-0 sm:justify-between">
              <Button
                onClick={handlePrevious}
                disabled={currentQuestion === 0}
                variant="secondary"
                className="w-full sm:w-auto text-sm sm:text-base order-2 sm:order-1"
              >
                ← Regresar
              </Button>

              <Button
                onClick={handleNext}
                disabled={!isAnswered()}
                className="w-full sm:w-auto text-sm sm:text-base order-1 sm:order-2"
              >
                {currentQuestion === questions.length - 1 ? 'Finalizar' : 'Siguiente →'}
              </Button>
            </div>
          </div>
        )}

        {/* Loading Recommendation */}
        {isGettingRecommendation && (
          <div className="bg-white rounded-lg shadow-md border border-[#b17b6b] p-6 sm:p-10 md:p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-b-2 border-[#6b2c2c] mx-auto mb-4"></div>
            <p className="text-[#6b2c2c] text-sm sm:text-base md:text-lg px-2">
              Analizando tus preferencias y preparando tu recomendación...
            </p>
          </div>
        )}

        {/* Recommendation Section */}
        {testCompleted && recommendation && recommendation.product && (
          <div className="bg-white rounded-lg shadow-md border border-[#b17b6b] p-4 sm:p-6 md:p-8">
            <h2 className="text-xl sm:text-2xl font-bold text-[#6b2c2c] mb-4 sm:mb-6 text-center">
              Tu Recomendación Personalizada
            </h2>

            <div className="space-y-4 sm:space-y-6">
              <div className="text-center">
                <p className="text-sm sm:text-base text-[#6b2c2c] mb-4 px-2">
                  {recommendation.message || 'Basado en tus respuestas, te recomendamos:'}
                </p>
              </div>

              {recommendation.product.id_producto && (
                <div className="flex justify-center">
                  <ProductCard
                    key={`rec-${recommendation.product.id_producto}`}
                    product={recommendation.product}
                  />
                </div>
              )}

              {recommendation.explanation && (
                <div className="bg-[#f5e6d3] border border-[#b17b6b] p-3 sm:p-4 rounded-lg">
                  <h3 className="font-semibold text-[#6b2c2c] mb-2 text-sm sm:text-base">
                    ¿Por qué esta recomendación?
                  </h3>
                  <p className="text-[#6b2c2c] opacity-80 text-xs sm:text-sm">{recommendation.explanation}</p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Button
                  onClick={handleGoToCatalog}
                  variant="primary"
                  className="flex-1 text-sm sm:text-base"
                >
                  Ver Catálogo Completo
                </Button>
                <Button
                  onClick={handleRestart}
                  variant="secondary"
                  className="flex-1 text-sm sm:text-base"
                >
                  Hacer Nuevo Test
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PreferencesTest;
