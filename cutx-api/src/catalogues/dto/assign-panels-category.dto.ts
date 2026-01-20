import { IsArray, IsString, IsNotEmpty, ArrayMinSize } from 'class-validator';

/**
 * DTO pour assigner plusieurs panels à une catégorie
 * Utilisé par l'admin pour organiser les panels dans l'arborescence
 */
export class AssignPanelsCategoryDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Au moins un panel doit être sélectionné' })
  @IsString({ each: true })
  panelIds: string[];

  @IsString()
  @IsNotEmpty({ message: 'La catégorie cible est requise' })
  categoryId: string;
}
