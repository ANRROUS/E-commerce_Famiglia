import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setUser } from "../redux/slices/authSlice";
import { authAPI } from "../services/api";
import { CircularProgress, Box, Typography } from "@mui/material";

export default function GoogleCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();

    useEffect(() => {
        const handleCallback = async () => {
            const token = searchParams.get("token");
            const error = searchParams.get("error");

            if (error) {
                console.error("Google auth error:", error);
                navigate("/login?error=" + error);
                return;
            }

            if (token) {
                // Store token
                localStorage.setItem("token", token);

                try {
                    // Get user profile
                    const response = await authAPI.getPerfil();
                    dispatch(setUser(response.data.usuario));
                    navigate("/");
                } catch (err) {
                    console.error("Error fetching profile:", err);
                    navigate("/login?error=profile_fetch_failed");
                }
            } else {
                navigate("/login?error=no_token");
            }
        };

        handleCallback();
    }, [searchParams, navigate, dispatch]);

    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "100vh",
                gap: 2,
            }}
        >
            <CircularProgress sx={{ color: "#C94549" }} />
            <Typography variant="body1" color="textSecondary">
                Iniciando sesión con Google...
            </Typography>
        </Box>
    );
}
