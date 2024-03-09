// Utiliza import para importar los módulos necesarios
import jsonwebtoken from 'jsonwebtoken';

// Generalmente mantengo el token entre 5 y 15 minutos
function generateAccessToken(user) {
  return jsonwebtoken.sign({ userId: user.id }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: '5m',
  });
}

// Elegí 8 horas porque prefiero que el usuario vuelva a iniciar sesión cada día.
// Pero mantenerlo conectado si está utilizando la aplicación.
// Puedes cambiar este valor según la lógica de tu aplicación.
// Yo optaría por un máximo de 7 días, y hacer que vuelva a iniciar sesión después de 7 días de inactividad.
function generateRefreshToken(user, jti) {
  return jsonwebtoken.sign({
    userId: user.id,
    jti
  }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: '8h',
  });
}

function generateTokens(user, jti) {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user, jti);

  return {
    accessToken,
    refreshToken,
  };
}

// Exporta las funciones necesarias
export {
  generateAccessToken,
  generateRefreshToken,
  generateTokens
};
