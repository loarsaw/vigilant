import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface DeepLinkData {
  action: string;
  params: Record<string, string>;
  fullUrl: string;
}

export const useDeepLink = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleDeepLink = (data: DeepLinkData) => {
      const { action, params } = data;

      if (params.domain_name && params.username && params.password) {
        const queryParams = new URLSearchParams();

        Object.entries(params).forEach(([key, value]) => {
          queryParams.append(key, value);
        });

        const queryString = queryParams.toString();
        const route = `/linkstart?${queryString}`;

        console.log("Navigating to:", route);
        navigate(route);
        return;
      }

      console.warn("Deep link received but missing required params:", data);
      navigate("/");
    };

    window.api.onDeepLink(handleDeepLink);

    return () => {
      window.api.removeDeepLinkListener();
    };
  }, [navigate]);
};
