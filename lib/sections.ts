import {
  Award,
  GalleryHorizontalEnd,
  Home,
  ListTodo,
  type LucideIcon,
  Milestone,
  PieChart,
  Route,
  Wrench,
} from "lucide-react";

export interface SectionMeta {
  id: string;
  label: string;
  icon: LucideIcon;
}

export const SECTIONS: SectionMeta[] = [
  { id: "capa", label: "Capa", icon: Home },
  { id: "resumo", label: "Resumo", icon: ListTodo },
  { id: "timeline", label: "Timeline", icon: Milestone },
  { id: "servicos", label: "Serviços", icon: Wrench },
  { id: "fotos", label: "Fotos", icon: GalleryHorizontalEnd },
  { id: "graficos", label: "Gráficos", icon: PieChart },
  { id: "caminho-critico", label: "Caminho Crítico", icon: Route },
  { id: "resultado", label: "Resultado", icon: Award },
];
