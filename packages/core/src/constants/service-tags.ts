export const SERVICE_TAG = {
  AppConfig: "app/AppConfig",
  Database: "app/Database",
  Translator: "app/Translator",
  Clock: "app/Clock",
  Mailer: "app/Mailer",
  Crypto: "app/Crypto",
  RateLimiter: "app/RateLimiter",
  ObjectStore: "app/ObjectStore",

  Users: "app/Users",
  Sessions: "app/Sessions",
  ApiKeys: "app/ApiKeys",
  PasswordHasher: "app/PasswordHasher",
  AuditLog: "app/AuditLog",

  Monitors: "app/Monitors",
  Extractors: "app/Extractors",
  MonitorRepository: "app/MonitorRepository",
  UserRepository: "app/UserRepository",
  SessionRepository: "app/SessionRepository",
  RunRepository: "app/RunRepository",
  ChangeRepository: "app/ChangeRepository",
  ChannelRepository: "app/ChannelRepository",
  RuleRepository: "app/RuleRepository",
  DeliveryRepository: "app/DeliveryRepository",

  StrategyRegistry: "app/StrategyRegistry",
  HttpStrategy: "app/HttpStrategy",
  BrowserStrategy: "app/BrowserStrategy",
  Extraction: "app/Extraction",
  TransformPipeline: "app/TransformPipeline",
  ContentNormalizer: "app/ContentNormalizer",
  RobotsCache: "app/RobotsCache",
  UrlGuard: "app/UrlGuard",

  ScrapeRunner: "app/ScrapeRunner",
  Differ: "app/Differ",
  RuleEvaluator: "app/RuleEvaluator",

  ChannelSet: "app/ChannelSet",
  ChannelRegistry: "app/ChannelRegistry",
  NotificationDispatcher: "app/NotificationDispatcher",
  TemplateRenderer: "app/TemplateRenderer",

  JobProducer: "app/JobProducer",
  QueueRegistry: "app/QueueRegistry",
  RedisClient: "app/RedisClient",
} as const

export type ServiceTag = (typeof SERVICE_TAG)[keyof typeof SERVICE_TAG]
