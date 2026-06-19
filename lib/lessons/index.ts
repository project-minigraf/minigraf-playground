import type { Tutorial } from '@/lib/types'
import { tutorialBasicDatalog } from './tutorial-basic-datalog'
import { tutorialMarketplace } from './tutorial-marketplace'
import { tutorialOrgChart } from './tutorial-org-chart'
import { tutorialSportsLeague } from './tutorial-sports-league'
import { tutorialTransit } from './tutorial-transit'

export const TUTORIALS: Tutorial[] = [
  tutorialBasicDatalog,
  tutorialMarketplace,
  tutorialOrgChart,
  tutorialSportsLeague,
  tutorialTransit,
]
