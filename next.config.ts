import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
        pathname: "/wikipedia/commons/**",
      },
      {
        protocol: "https",
        hostname: "commons.wikimedia.org",
        pathname: "/wiki/Special:Redirect/file/**",
      },
      {
        protocol: "https",
        hostname: "www.themealdb.com",
        pathname: "/images/media/meals/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/photo-*",
        search: "?auto=format&fit=crop&q=88&w=1200",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/photo-*",
        search: "?auto=format&fit=crop&q=88&w=1400",
      },
      {
        protocol: "https",
        hostname: "cdn.tatlerasia.com",
        pathname: "/tatlerasia/**",
      },
      {
        protocol: "https",
        hostname: "img.mingchu.co",
        pathname: "/Nuploads/**",
      },
      {
        protocol: "https",
        hostname: "sghimages.shobserver.com",
        pathname: "/img/catch/**",
      },
      {
        protocol: "https",
        hostname: "www.psheying.com",
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "cdn.macaro-ni.jp",
        pathname: "/image/**",
      },
      {
        protocol: "https",
        hostname: "decoracionalcazaba.com",
        pathname: "/cdn/shop/files/**",
      },
    ],
  },
};

export default nextConfig;
